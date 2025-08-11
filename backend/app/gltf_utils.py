from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from pygltflib import GLTF2


def inspect_gltf_metadata(gltf_path: Path) -> Dict[str, Any]:
    if not gltf_path.exists():
        return {"exists": False, "error": f"File not found: {gltf_path}"}

    try:
        gltf = GLTF2().load(str(gltf_path))

        num_nodes = len(gltf.nodes or [])
        num_meshes = len(gltf.meshes or [])
        num_materials = len(gltf.materials or [])
        num_scenes = len(gltf.scenes or [])

        node_names = [n.name for n in (gltf.nodes or []) if n and n.name]
        material_names = [m.name for m in (gltf.materials or []) if m and m.name]

        return {
            "exists": True,
            "path": str(gltf_path),
            "num_nodes": num_nodes,
            "num_meshes": num_meshes,
            "num_materials": num_materials,
            "num_scenes": num_scenes,
            "node_names": node_names,
            "material_names": material_names,
        }
    except Exception as exc:  # pragma: no cover - defensive
        return {"exists": True, "error": str(exc), "path": str(gltf_path)}


