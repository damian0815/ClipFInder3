from osxmetadata import OSXMetaData
import torch
from typing import List

def get_tags(path):
    try:
        md = OSXMetaData(path)
        return [t[0] for t in md.tags]
    except FileNotFoundError:
        return []


def minimum_cost_path_coverage(distance_matrix: torch.Tensor) -> List[int]:
    """
    Find K non-intersecting paths that together cover all nodes with minimum total cost.

    This is a greedy approximation algorithm that builds paths by:
    1. Sorting all edges by distance (shortest first)
    2. Greedily adding edges that connect unvisited nodes or extend existing paths
    3. Adding any remaining isolated nodes at the end

    This approach is much faster than TSP (O(n²log n) vs O(n!)) while still
    creating semantically coherent orderings for browsing.

    Args:
        distance_matrix: Square symmetric matrix of distances between nodes
        num_paths: Target number of paths. If None, will be determined automatically

    Returns:
        List of node indices in the order they should be visited
    """
    n = distance_matrix.shape[0]
    if n <= 1:
        return list(range(n))

    # Get all edges sorted by distance (convert to CPU for faster sorting)
    distance_cpu = distance_matrix.cpu()
    edges = []
    for i in range(n):
        for j in range(i + 1, n):
            edges.append((distance_cpu[i, j].item(), i, j))
    edges.sort()

    # Track which nodes have been visited and which path they belong to
    visited = [False] * n
    node_to_path = [-1] * n
    paths = []

    # add node 0, force start
    visited[0] = True
    node_to_path[0] = 0
    paths.append([-1, 0])

    # Greedily add edges that extend paths or connect unvisited nodes
    for dist, u, v in edges:
        path_u = node_to_path[u] if visited[u] else -1
        path_v = node_to_path[v] if visited[v] else -1

        # Skip if both nodes are already in the same path (would create cycle)
        if path_u != -1 and path_u == path_v:
            continue

        # Skip if one of the nodes is already in a path and not either endpoint
        if path_u != -1:
            path = paths[path_u]
            if u != path[0] and u != path[-1]:
                continue
        if path_v != -1:
            path = paths[path_v]
            if v != path[0] and v != path[-1]:
                continue

        # Mark nodes as visited
        visited[u] = True
        visited[v] = True

        #print(f'{u}-{v} {dist=} {path_u=} {path_v=}')

        # Handle path assignment
        if path_u == -1 and path_v == -1:
            # Start new path with both nodes
            new_path_id = len(paths)
            paths.append([u, v])
            node_to_path[u] = new_path_id
            node_to_path[v] = new_path_id
            #print(f'-> new path {new_path_id}:', paths[-1])
        elif path_u == -1:
            # Extend existing path with u
            path = paths[path_v]
            if path[0] == v:
                path.insert(0, u)
            elif path[-1] == v:
                path.append(u)
            else:
                # This shouldn't happen if our path tracking is correct
                raise ValueError(f"Node {v} is not at either endpoint of its path")
            node_to_path[u] = path_v
            #print(f'-> extend {path_v}:', paths[path_v])
        elif path_v == -1:
            # Extend existing path with v
            path = paths[path_u]
            if path[0] == u:
                path.insert(0, v)
            elif path[-1] == u:
                path.append(v)
            else:
                # This shouldn't happen if our path tracking is correct
                raise ValueError(f"Node {u} is not at either endpoint of its path")
            node_to_path[v] = path_u
            #print(f'-> extend {path_u}:', paths[path_u])
        else:
            # Merge two existing paths
            path1 = paths[path_u]
            path2 = paths[path_v]

            # Find optimal way to connect the paths
            # Connect endpoints that are being joined
            if u == path1[0] and v == path2[0]:
                merged = path1[::-1] + path2
            elif u == path1[0] and v == path2[-1]:
                merged = path1[::-1] + path2[::-1]
            elif u == path1[-1] and v == path2[0]:
                merged = path1 + path2
            elif u == path1[-1] and v == path2[-1]:
                merged = path1 + path2[::-1]
            else:
                # Shouldn't happen with proper path tracking, but handle anyway
                merged = path1 + path2

            #print(f'-> merge {path1} {path2}')

            # Update path assignments for all nodes in path2
            for node in path2:
                node_to_path[node] = path_u
            paths[path_u] = merged
            paths[path_v] = []  # Mark as empty

    # Collect all nodes in paths
    result_order = []
    for path in paths:
        if path:  # Skip empty paths
            #print('adding path:', path)
            # -1 is our start marker (we always wanted to start at node 0)
            if path[0] == -1:
                path = path[1:]
            elif path[-1] == -1:
                path = reversed(path[:-1])
            elif -1 in path:
                raise RuntimeError("should have preserved -1 only at endpoints")
            result_order.extend(path)

    # Add any remaining unvisited nodes
    unvisited = [i for i in range(n) if not visited[i]]

    #print('adding unvisited:', unvisited)
    result_order.extend(unvisited)

    return result_order



