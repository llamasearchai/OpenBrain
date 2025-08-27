from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON, UUID
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
from typing import Dict, Any
import uuid

Base = declarative_base()

class AgentSession(Base):
    __tablename__ = 'agent_sessions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)  # Optional user association
    provider = Column(String(50), nullable=False)  # LLM provider used
    model = Column(String(100), nullable=False)    # Model used
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    metadata_ = Column('metadata', JSON, nullable=True)  # Session metadata
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': str(self.id),
            'user_id': str(self.user_id) if self.user_id else None,
            'provider': self.provider,
            'model': self.model,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'metadata': self.metadata_
        }

class AgentMemory(Base):
    __tablename__ = 'agent_memories'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey('agent_sessions.id'), nullable=False)
    content = Column(Text, nullable=False)  # Memory content
    role = Column(String(20), nullable=False, default='user')  # user, assistant, system
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    metadata_ = Column('metadata', JSON, nullable=True)  # Additional metadata
    embedding = Column(JSON, nullable=True)  # Vector embedding for similarity search
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': str(self.id),
            'session_id': str(self.session_id),
            'content': self.content,
            'role': self.role,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'metadata': self.metadata_,
            'embedding': self.embedding
        }

class AgentPromptTemplate(Base):
    __tablename__ = 'agent_prompt_templates'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)  # Template name
    description = Column(Text, nullable=True)  # Template description
    system_prompt = Column(Text, nullable=False)  # System prompt template
    user_prompt_template = Column(Text, nullable=False)  # User prompt template with placeholders
    provider = Column(String(50), nullable=True)  # Specific provider this template is for
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': str(self.id),
            'name': self.name,
            'description': self.description,
            'system_prompt': self.system_prompt,
            'user_prompt_template': self.user_prompt_template,
            'provider': self.provider,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class RAGDocument(Base):
    __tablename__ = 'rag_documents'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)  # Document title
    content = Column(Text, nullable=False)  # Document content
    source = Column(String(200), nullable=True)  # Document source
    document_type = Column(String(50), nullable=False)  # Type of document (pdf, txt, etc.)
    embedding = Column(JSON, nullable=True)  # Vector embedding for similarity search
    metadata_ = Column('metadata', JSON, nullable=True)  # Additional metadata
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': str(self.id),
            'title': self.title,
            'content': self.content,
            'source': self.source,
            'document_type': self.document_type,
            'metadata': self.metadata_,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
