from typing import List, Optional

from app.models.pipeline import PipelineNode


def resolve_entry_agent(nodes: List[PipelineNode]) -> Optional[PipelineNode]:
    """Return the entry-point agent node for a pipeline.

    Prefers the first priced agent (priceAlgo > 0), falling back to the first
    agent node in the list. Returns None if there are no agent nodes.
    """
    priced = [node for node in nodes if node.type == "agent" and (node.data.priceAlgo or 0) > 0]
    if priced:
        return priced[0]

    return next((node for node in nodes if node.type == "agent"), None)
