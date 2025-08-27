# OpenBrain Production Architecture Upgrade Plan - Part 2

## Phase 5: Data Management & Persistence (Continued)

### 5.3 Event Sourcing and Audit Logging
```python
# backend/app/events/event_store.py
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Event(Base):
    __tablename__ = 'events'
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    aggregate_id = Column(UUID, index=True, nullable=False)
    aggregate_type = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    event_version = Column(Integer, nullable=False)
    event_data = Column(JSON, nullable=False)
    metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    created_by = Column(UUID)

class EventStore:
    def __init__(self, session_factory):
        self.session_factory = session_factory
        self.handlers = {}
        self.projections = {}
    
    async def append(self, aggregate_id: UUID, events: List[DomainEvent]):
        async with self.session_factory() as session:
            for event in events:
                db_event = Event(
                    aggregate_id=aggregate_id,
                    aggregate_type=event.aggregate_type,
                    event_type=event.__class__.__name__,
                    event_version=event.version,
                    event_data=event.to_dict(),
                    metadata=event.metadata,
                    created_by=event.created_by
                )
                session.add(db_event)
            
            await session.commit()
            
            # Publish events to projections
            for event in events:
                await self._publish_to_projections(event)
    
    async def get_events(self, aggregate_id: UUID, from_version: int = 0) -> List[DomainEvent]:
        async with self.session_factory() as session:
            result = await session.execute(
                select(Event)
                .where(Event.aggregate_id == aggregate_id)
                .where(Event.event_version > from_version)
                .order_by(Event.event_version)
            )
            
            events = []
            for row in result.scalars():
                event_class = self._get_event_class(row.event_type)
                event = event_class.from_dict(row.event_data)
                event.metadata = row.metadata
                events.append(event)
            
            return events
    
    async def replay_events(self, aggregate_id: UUID) -> Aggregate:
        events = await self.get_events(aggregate_id)
        aggregate = self._create_aggregate(events[0].aggregate_type)
        
        for event in events:
            aggregate.apply(event)
        
        return aggregate

# Audit logging implementation
class AuditLog(Base):
    __tablename__ = 'audit_logs'
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_id = Column(UUID, index=True)
    action = Column(String, nullable=False)
    resource_type = Column(String)
    resource_id = Column(String)
    ip_address = Column(String)
    user_agent = Column(String)
    request_method = Column(String)
    request_path = Column(String)
    response_status = Column(Integer)
    duration_ms = Column(Integer)
    metadata = Column(JSON)

class AuditLogger:
    def __init__(self, session_factory):
        self.session_factory = session_factory
    
    async def log(self, audit_entry: AuditEntry):
        async with self.session_factory() as session:
            log = AuditLog(
                user_id=audit_entry.user_id,
                action=audit_entry.action,
                resource_type=audit_entry.resource_type,
                resource_id=audit_entry.resource_id,
                ip_address=audit_entry.ip_address,
                user_agent=audit_entry.user_agent,
                request_method=audit_entry.request_method,
                request_path=audit_entry.request_path,
                response_status=audit_entry.response_status,
                duration_ms=audit_entry.duration_ms,
                metadata=audit_entry.metadata
            )
            session.add(log)
            await session.commit()
```

## Phase 6: Testing & Quality Assurance (Week 9)

### 6.1 Comprehensive Test Suite
```python
# backend/tests/test_brain_simulation.py
import pytest
from httpx import AsyncClient
from unittest.mock import Mock, patch
import asyncio

@pytest.mark.asyncio
class TestBrainSimulation:
    async def test_neural_activity_generation(self, client: AsyncClient):
        """Test that neural activity is generated correctly"""
        response = await client.get("/api/v1/brain/activity")
        assert response.status_code == 200
        
        data = response.json()
        assert "regions" in data
        assert "connections" in data
        assert "timestamp" in data
        
        # Validate region data
        for region in data["regions"]:
            assert 0 <= region["activation"] <= 1
            assert region["name"] in VALID_BRAIN_REGIONS
    
    async def test_websocket_streaming(self, client: AsyncClient):
        """Test WebSocket streaming of brain data"""
        async with client.websocket_connect("/ws/brain") as websocket:
            # Send configuration
            await websocket.send_json({
                "action": "configure",
                "config": {
                    "frequency": 10,
                    "regions": ["frontal", "parietal"],
                    "metrics": ["activation", "connectivity"]
                }
            })
            
            # Receive multiple frames
            frames = []
            for _ in range(5):
                data = await websocket.receive_json()
                frames.append(data)
            
            # Validate frames
            assert len(frames) == 5
            for frame in frames:
                assert "timestamp" in frame
                assert "data" in frame
                assert frame["data"]["regions"]["frontal"] is not None
    
    async def test_brain_region_interaction(self, client: AsyncClient):
        """Test interactive brain region selection"""
        # Select a region
        response = await client.post("/api/v1/brain/regions/select", json={
            "region": "frontal_lobe",
            "highlight": True
        })
        assert response.status_code == 200
        
        # Get region details
        response = await client.get("/api/v1/brain/regions/frontal_lobe")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Frontal Lobe"
        assert "subregions" in data
        assert "functions" in data

# Integration tests
@pytest.mark.integration
class TestIntegration:
    async def test_end_to_end_workflow(self, client: AsyncClient, db_session):
        """Test complete user workflow"""
        # 1. Register user
        response = await client.post("/auth/register", json={
            "email": "test@example.com",
            "password": "SecurePassword123!"
        })
        assert response.status_code == 201
        user_id = response.json()["id"]
        
        # 2. Login
        response = await client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "SecurePassword123!"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        # 3. Create brain session
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/api/v1/sessions", headers=headers, json={
            "name": "Test Session",
            "configuration": {
                "visualization_mode": "fmri",
                "sampling_rate": 100
            }
        })
        assert response.status_code == 201
        session_id = response.json()["id"]
        
        # 4. Stream data via WebSocket
        async with client.websocket_connect(
            f"/ws/brain?token={token}&session={session_id}"
        ) as websocket:
            # Receive initial state
            data = await websocket.receive_json()
            assert data["type"] == "initial_state"
            
            # Send command
            await websocket.send_json({
                "action": "start_simulation",
                "parameters": {"duration": 10}
            })
            
            # Collect simulation data
            simulation_data = []
            start_time = asyncio.get_event_loop().time()
            while asyncio.get_event_loop().time() - start_time < 2:
                try:
                    data = await asyncio.wait_for(
                        websocket.receive_json(),
                        timeout=0.5
                    )
                    simulation_data.append(data)
                except asyncio.TimeoutError:
                    break
            
            assert len(simulation_data) > 0
        
        # 5. Retrieve session data
        response = await client.get(
            f"/api/v1/sessions/{session_id}",
            headers=headers
        )
        assert response.status_code == 200
        session_data = response.json()
        assert session_data["id"] == session_id
        assert "metrics" in session_data
```

### 6.2 Load Testing
```python
# tests/load/locustfile.py
from locust import HttpUser, task, between
import json
import random

class BrainUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login
        response = self.client.post("/auth/login", json={
            "email": "loadtest@example.com",
            "password": "LoadTest123!"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def view_brain_activity(self):
        self.client.get("/api/v1/brain/activity", headers=self.headers)
    
    @task(2)
    def get_brain_regions(self):
        regions = ["frontal", "parietal", "temporal", "occipital"]
        region = random.choice(regions)
        self.client.get(f"/api/v1/brain/regions/{region}", headers=self.headers)
    
    @task(1)
    def create_annotation(self):
        self.client.post("/api/v1/annotations", headers=self.headers, json={
            "position": {"x": random.random(), "y": random.random(), "z": random.random()},
            "text": f"Test annotation {random.randint(1, 1000)}",
            "region": "frontal_lobe"
        })
    
    @task(4)
    def websocket_stream(self):
        with self.client.websocket_connect(
            f"/ws/brain?token={self.token}",
            subprotocols=["websocket"]
        ) as ws:
            for _ in range(10):
                ws.receive()
```

## Phase 7: Security & Compliance (Week 10)

### 7.1 OAuth2/OIDC Implementation
```python
# backend/app/auth/oauth.py
from authlib.integrations.starlette_client import OAuth
from fastapi import HTTPException
from jose import JWTError, jwt
from datetime import datetime, timedelta

class OAuthProvider:
    def __init__(self):
        self.oauth = OAuth()
        self._configure_providers()
    
    def _configure_providers(self):
        # Google OAuth
        self.oauth.register(
            name='google',
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
            client_kwargs={'scope': 'openid email profile'}
        )
        
        # GitHub OAuth
        self.oauth.register(
            name='github',
            client_id=settings.github_client_id,
            client_secret=settings.github_client_secret,
            access_token_url='https://github.com/login/oauth/access_token',
            authorize_url='https://github.com/login/oauth/authorize',
            api_base_url='https://api.github.com/',
            client_kwargs={'scope': 'user:email'}
        )
    
    async def login(self, provider: str, request):
        client = self.oauth.create_client(provider)
        redirect_uri = request.url_for('auth_callback', provider=provider)
        return await client.authorize_redirect(request, redirect_uri)
    
    async def callback(self, provider: str, request):
        client = self.oauth.create_client(provider)
        token = await client.authorize_access_token(request)
        
        # Get user info
        if provider == 'google':
            user_info = token.get('userinfo')
        elif provider == 'github':
            resp = await client.get('user', token=token)
            user_info = resp.json()
        
        # Create or update user
        user = await self.get_or_create_user(provider, user_info)
        
        # Generate JWT
        access_token = self.create_access_token(user)
        return {"access_token": access_token, "token_type": "bearer"}

class SecurityHeaders:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    headers = MutableHeaders(scope=message)
                    headers["X-Content-Type-Options"] = "nosniff"
                    headers["X-Frame-Options"] = "DENY"
                    headers["X-XSS-Protection"] = "1; mode=block"
                    headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
                    headers["Content-Security-Policy"] = self._get_csp()
                await send(message)
            
            await self.app(scope, receive, send_wrapper)
        else:
            await self.app(scope, receive, send)
    
    def _get_csp(self):
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' wss: https://api.openbrain.io"
        )
```

### 7.2 Data Encryption
```python
# backend/app/security/encryption.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import base64
import os

class EncryptionService:
    def __init__(self, master_key: str = None):
        self.master_key = master_key or settings.encryption_key
        self.fernet = Fernet(self._derive_key(self.master_key))
    
    def _derive_key(self, password: str) -> bytes:
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=settings.encryption_salt.encode(),
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key
    
    def encrypt(self, data: str) -> str:
        return self.fernet.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        return self.fernet.decrypt(encrypted_data.encode()).decode()
    
    def encrypt_field(self, value: Any) -> str:
        """Encrypt a database field"""
        json_value = json.dumps(value)
        return self.encrypt(json_value)
    
    def decrypt_field(self, encrypted_value: str) -> Any:
        """Decrypt a database field"""
        json_value = self.decrypt(encrypted_value)
        return json.loads(json_value)

# GDPR Compliance
class GDPRService:
    def __init__(self, db_session):
        self.db = db_session
        self.encryption = EncryptionService()
    
    async def export_user_data(self, user_id: UUID) -> Dict:
        """Export all user data for GDPR compliance"""
        user_data = {
            "user": await self._get_user_info(user_id),
            "sessions": await self._get_user_sessions(user_id),
            "annotations": await self._get_user_annotations(user_id),
            "audit_logs": await self._get_user_audit_logs(user_id),
            "generated_at": datetime.utcnow().isoformat()
        }
        
        return user_data
    
    async def delete_user_data(self, user_id: UUID, retain_anonymized: bool = True):
        """Delete or anonymize user data"""
        if retain_anonymized:
            # Anonymize data
            await self._anonymize_user_data(user_id)
        else:
            # Complete deletion
            await self._delete_user_data(user_id)
    
    async def _anonymize_user_data(self, user_id: UUID):
        # Replace PII with anonymized values
        anonymous_id = f"anon_{uuid.uuid4().hex[:8]}"
        
        async with self.db() as session:
            # Update user record
            user = await session.get(User, user_id)
            user.email = f"{anonymous_id}@anonymized.local"
            user.name = f"Anonymous User {anonymous_id}"
            user.is_anonymized = True
            
            # Update related records
            await session.execute(
                update(BrainSession)
                .where(BrainSession.user_id == user_id)
                .values(metadata={"anonymized": True})
            )
            
            await session.commit()
```

## Phase 8: DevOps & Infrastructure (Week 11)

### 8.1 Kubernetes Deployment
```yaml
# deploy/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openbrain-api
  namespace: openbrain
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: openbrain-api
  template:
    metadata:
      labels:
        app: openbrain-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: api
        image: openbrain/api:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: openbrain-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: openbrain-secrets
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: openbrain-api
  namespace: openbrain
spec:
  selector:
    app: openbrain-api
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: openbrain-api-hpa
  namespace: openbrain
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: openbrain-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 8.2 Helm Chart
```yaml
# deploy/helm/openbrain/values.yaml
replicaCount: 3

image:
  repository: openbrain/api
  pullPolicy: IfNotPresent
  tag: ""

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
  hosts:
    - host: api.openbrain.io
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: openbrain-tls
      hosts:
        - api.openbrain.io

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

postgresql:
  enabled: true
  auth:
    database: openbrain
    username: openbrain
  primary:
    persistence:
      size: 10Gi
  metrics:
    enabled: true

redis:
  enabled: true
  auth:
    enabled: true
  master:
    persistence:
      size: 2Gi
  metrics:
    enabled: true

monitoring:
  prometheus:
    enabled: true
  grafana:
    enabled: true
  jaeger:
    enabled: true
```

### 8.3 Terraform Infrastructure
```hcl
# deploy/terraform/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "openbrain-cluster"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    main = {
      desired_size = 3
      min_size     = 3
      max_size     = 10

      instance_types = ["t3.medium"]
      
      k8s_labels = {
        Environment = "production"
        Application = "openbrain"
      }
    }
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier = "openbrain-db"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  storage_type         = "gp3"
  storage_encrypted    = true
  
  db_name  = "openbrain"
  username = "openbrain"
  password = random_password.db_password.result
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  tags = {
    Name        = "openbrain-db"
    Environment = "production"
  }
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "openbrain-redis"
  replication_group_description = "Redis for OpenBrain"
  
  engine               = "redis"
  engine_version       = "7.0"
  node_type           = "cache.t3.medium"
  number_cache_clusters = 2
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth.result
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  
  tags = {
    Name        = "openbrain-redis"
    Environment = "production"
  }
}

# S3 Bucket for assets
resource "aws_s3_bucket" "assets" {
  bucket = "openbrain-assets"
  
  tags = {
    Name        = "openbrain-assets"
    Environment = "production"
  }
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

## Phase 9: Documentation & Developer Experience (Week 12)

### 9.1 OpenAPI Documentation
```python
# backend/app/docs.py
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html

def custom_openapi(app: FastAPI):
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="OpenBrain API",
        version="1.0.0",
        description="""
        ## OpenBrain Digital Twin API
        
        OpenBrain provides a comprehensive API for brain visualization and neural simulation.
        
        ### Features
        - Real-time brain activity simulation
        - Multiple visualization modes (MRI, fMRI, DTI)
        - AI-powered analysis and insights
        - Time-series metrics and analytics
        - Secure authentication and authorization
        
        ### Authentication
        This API uses JWT Bearer tokens. Include the token in the Authorization header:
        ```
        Authorization: Bearer <your-token>
        ```
        """,
        routes=app.routes,
        servers=[
            {"url": "https://api.openbrain.io", "description": "Production"},
            {"url": "https://staging-api.openbrain.io", "description": "Staging"},
            {"url": "http://localhost:8000", "description": "Development"},
        ],
        tags=[
            {"name": "Authentication", "description": "User authentication and authorization"},
            {"name": "Brain", "description": "Brain visualization and simulation"},
            {"name": "Sessions", "description": "User sessions management"},
            {"name": "Agents", "description": "AI agent operations"},
            {"name": "Analytics", "description": "Metrics and analytics"},
        ],
    )
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        },
        "OAuth2": {
            "type": "oauth2",
            "flows": {
                "authorizationCode": {
                    "authorizationUrl": "https://api.openbrain.io/oauth/authorize",
                    "tokenUrl": "https://api.openbrain.io/oauth/token",
                    "scopes": {
                        "read": "Read access",
                        "write": "Write access",
                        "admin": "Admin access",
                    },
                },
            },
        },
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

# API Examples
@app.post(
    "/api/v1/brain/simulate",
    summary="Start brain simulation",
    description="Initiates a new brain simulation with specified parameters",
    response_model=SimulationResponse,
    responses={
        200: {
            "description": "Simulation started successfully",
            "content": {
                "application/json": {
                    "example": {
                        "session_id": "550e8400-e29b-41d4-a716-446655440000",
                        "status": "running",
                        "websocket_url": "wss://api.openbrain.io/ws/brain/550e8400",
                        "started_at": "2024-01-15T10:30:00Z"
                    }
                }
            }
        },
        400: {"description": "Invalid parameters"},
        401: {"description": "Unauthorized"},
    },
    tags=["Brain"]
)
async def start_simulation(
    request: SimulationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Start a new brain simulation.
    
    The simulation will run in real-time and stream data via WebSocket.
    
    **Parameters:**
    - `mode`: Visualization mode (structural, fmri, dti, eeg, connectivity)
    - `duration`: Simulation duration in seconds (max: 3600)
    - `frequency`: Data sampling frequency in Hz (1-1000)
    - `regions`: List of brain regions to simulate
    
    **WebSocket Connection:**
    After starting the simulation, connect to the WebSocket URL to receive real-time data.
    """
    pass
```

### 9.2 SDK Generation
```typescript
// sdk/typescript/src/OpenBrainClient.ts
export class OpenBrainClient {
  private apiKey: string;
  private baseUrl: string;
  private ws: WebSocket | null = null;
  
  constructor(config: OpenBrainConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openbrain
