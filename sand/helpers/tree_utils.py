from __future__ import annotations

from copy import copy
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, List, Literal, Optional, Set, Union

from typing_extensions import Self


@dataclass
class TreeStruct:
    __slots__ = ("p2cs", "c2ps")
    p2cs: Dict[str, Set[str]]  # from parent to children
    c2ps: Dict[str, Set[str]]  # from child to parents

    @staticmethod
    def construct(
        items: Union[Set[str], Dict[str, Any]],
        get_parents: Callable[[str], Iterable[str]],
    ):
        p2cs = {x: set() for x in items}
        c2ps = {x: set() for x in items}

        for item in items:
            parents = get_parents(item)
            for p in parents:
                if p in items:
                    p2cs[p].add(item)
                    c2ps[item].add(p)

        return TreeStruct(p2cs, c2ps)

    def ensure_tree(self, fix_method: Literal["auto", "manually"] = "auto") -> Self:
        """Make sure this is actually a poly-tree, not containing any cycle
        If we found a cycle, we remove one link to make it acyclic.
        """
        visited = set()
        cycles = []

        for c, ps in self.c2ps.items():
            if len(ps) == 0:
                path = {}
                backref = self._dfs_find_backref(c, path, visited)
                if backref is None:
                    continue
                cycles.append(self._get_cycles(path, backref))

        if len(visited) == len(self.c2ps) and len(cycles) == 0:
            # all nodes have been visited, and no cycles found
            return self

        if fix_method == "manually":
            if len(cycles) == 0:
                for c in self.c2ps:
                    if c in visited:
                        continue
                    path = {}
                    backref = self._dfs_find_backref(c, path, visited)
                    if backref is None:
                        continue
                    cycles.append(self._get_cycles(path, backref))
            raise ValueError(f"Found cycles: {cycles}")

        if len(cycles) == 0:
            for c in self.c2ps:
                if c in visited:
                    continue
                path = {}
                backref = self._dfs_find_backref(c, path, visited)
                if backref is None:
                    continue
                cycles.append(self._get_cycles(path, backref))

        if fix_method == "manually":
            raise ValueError(f"Found cycles: {cycles}")

        # those cycles are disjoint, so we can break them one by one
        for cycle in cycles:
            self._break_cycles(cycle)

        return self.ensure_tree()

    def _dfs_find_backref(
        self, node: str, path: Dict[str, int], visited: Set[str]
    ) -> Optional[str]:
        """Using DFS to find back reference edge in the tree"""
        if node in path:
            return node

        # visiting this node
        path[node] = len(path)
        visited.add(node)

        for child in self.p2cs[node]:
            if (resp := self._dfs_find_backref(child, path, visited)) is not None:
                return resp

        path.pop(node)
        return None

    def _get_cycles(self, path: Dict[str, int], backref: str) -> List[str]:
        """Extract cycles from DFS results."""
        items = list(path.items())
        # just want to make sure that the items are in order
        assert all(items[i][1] + 1 == items[i + 1][1] for i in range(len(items) - 1))

        idx = next(i for i in range(len(items)) if items[i][0] == backref)
        # remove the previous edges that does not create cycles
        return [x[0] for x in items[idx:]]

    def _break_cycles(self, cycle: List[str]):
        # we find the node that has the most children to remove
        best_item_index = max(
            range(len(cycle)), key=lambda x: len(self.p2cs[cycle[x][0]])
        )
        source = cycle[best_item_index][0]
        target = cycle[(best_item_index + 1) % len(cycle)][0]
        self.p2cs[source].remove(target)
        self.c2ps[target].remove(source)
