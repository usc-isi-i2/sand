import copy
from rdflib import RDFS
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple
import serde.prelude as serde
from sm.namespaces.wikidata import WikidataNamespace
import sm.outputs.semantic_model as O
from sand.controllers.assistant import Assistant
from sand.models.base import init_db

from sand.models.table import CandidateEntity, Link, Table, TableRow


class MTabAssistant(Assistant):
    def __init__(self):
        self.cache_dir = Path(f"/tmp/mtab")
        self.cache_dir.mkdir(exist_ok=True)

        self.id2label = {}

    def predict(self, table: Table, rows: List[TableRow]):
        content = [table.columns]
        for row in rows:
            content.append([str(x) for x in row.row])

        cwd = self.cache_dir / f"p{table.project.id}-t:{table.id}-{table.name}"
        cwd.mkdir(exist_ok=True)
        infile = cwd / "infile.csv"
        outfile = cwd / "outfile.json"

        rerun = True
        if infile.exists() and outfile.exists():
            serde.csv.ser(content, str(infile) + ".tmp")
            if serde.textline.deser(infile) == serde.textline.deser(
                str(infile) + ".tmp"
            ):
                rerun = False

        if rerun:
            serde.csv.ser(content, infile)
            subprocess.check_call(
                [
                    "curl",
                    "-X",
                    "POST",
                    "-F",
                    f"file=@{str(infile)}",
                    "https://mtab.app/api/v1/mtab?limit=1000",
                    "-o",
                    outfile,
                ]
            )

        record = serde.json.deser(outfile)
        assert record["status"] == "Success"

        semantic = record["tables"][0]["semantic"]

        cpa, cta = [], {}
        for item in semantic["cpa"]:
            source, target = item["target"]
            # assert len(item["annotation"]) == 1
            uri = item["annotation"][0]["wikidata"]
            label = item["annotation"][0]["label"]
            assert uri.startswith("http://www.wikidata.org/prop/direct/")
            pid = uri.replace("http://www.wikidata.org/prop/direct/", "")
            self.id2label[pid] = label
            cpa.append((source, target, pid))

        for item in semantic["cta"]:
            # assert len(item["annotation"]) == 1
            uri = item["annotation"][0]["wikidata"]
            label = item["annotation"][0]["label"]
            assert uri.startswith("http://www.wikidata.org/entity/")
            qid = uri.replace("http://www.wikidata.org/entity/", "")
            cta[item["target"]] = qid
            self.id2label[qid] = label

        pred_sm = self.create_sm_from_cta_cpa(table.columns, cpa, cta)

        # clean previous data -- temporary solution for now before we tag each result with
        # individual method
        rows = copy.deepcopy(rows)
        for row in rows:
            row.links = {}

        for ann in semantic["cea"]:
            ri, ci = ann["target"]
            ri = ri - 1
            if ri == -1:
                continue

            uri = ann["annotation"]["wikidata"]
            if uri.startswith("http://www.wikidata.org/entity/"):
                entid = uri.replace("http://www.wikidata.org/entity/", "")
            elif uri.startswith("http://www.wikidata.org/prop/direct/"):
                entid = uri.replace("http://www.wikidata.org/prop/direct/", "")
            else:
                raise ValueError(uri)

            if str(ci) not in rows[ri].links:
                rows[ri].links[str(ci)] = [
                    Link(
                        start=0,
                        end=len(str(rows[ri].row[ci])),
                        url=None,
                        entity_id=None,
                        candidate_entities=[],
                    )
                ]
            rows[ri].links[str(ci)][0].candidate_entities.append(
                CandidateEntity(entity_id=entid, probability=1.0)
            )

        return pred_sm, rows

    def create_sm_from_cta_cpa(
        self,
        columns: List[str],
        rels: List[Tuple[int, int, str]],
        types: Dict[int, str],
    ) -> O.SemanticModel:
        """Create a semantic model from a list of columns, CPA, and CTA.

        Args:
            columns: list of column names
            rels: list of (source column index, target column index, prop id not url)
            types: a mapping from column index to WDEntity id (not url)
        """
        sm = O.SemanticModel()

        # create class nodes first
        classmap = {}

        for cid, qnode_id in types.items():
            dnode = O.DataNode(
                col_index=cid,
                label=columns[cid],
            )

            # somehow, they may end-up predict multiple classes, we need to select one
            if qnode_id.find(" ") != -1:
                qnode_id = qnode_id.split(" ")[0]
            curl = WikidataNamespace.get_entity_abs_uri(qnode_id)

            try:
                cnode_label = f"{self.id2label[qnode_id]} ({qnode_id})"
            except KeyError:
                cnode_label = WikidataNamespace.get_entity_rel_uri(qnode_id)
            cnode = O.ClassNode(
                abs_uri=curl,
                rel_uri=WikidataNamespace.get_entity_rel_uri(qnode_id),
                readable_label=cnode_label,
            )
            sm.add_node(dnode)
            sm.add_node(cnode)
            sm.add_edge(
                O.Edge(
                    source=cnode.id,
                    target=dnode.id,
                    abs_uri=str(RDFS.label),
                    rel_uri="rdfs:label",
                    readable_label="rdfs:label",
                )
            )

            classmap[dnode.id] = cnode.id

        # now complete the relationships
        for source_cid, target_cid, prop in rels:
            if sm.has_data_node(source_cid):
                source = sm.get_data_node(source_cid)
                # if source node is an NE column, we need to use a class id instead
                if source.id in classmap:
                    source = sm.get_node(classmap[source.id])
            else:
                # create a data node
                source = O.DataNode(
                    col_index=source_cid,
                    label=columns[source_cid],
                )
                sm.add_node(source)

            if sm.has_data_node(target_cid):
                # if target node is an NE column, we need to use a class id instead
                target = sm.get_data_node(target_cid)
                if target.id in classmap:
                    target = sm.get_node(classmap[target.id])
            else:
                # create a data node
                target = O.DataNode(col_index=target_cid, label=columns[target_cid])
                sm.add_node(target)

            sm.add_edge(
                O.Edge(
                    source=source.id,
                    target=target.id,
                    abs_uri=WikidataNamespace.get_prop_abs_uri(prop),
                    rel_uri=WikidataNamespace.get_prop_rel_uri(prop),
                    readable_label=f"{self.id2label[prop]} ({prop})",
                )
            )

        # complete missing data nodes
        for ci, col in enumerate(columns):
            if sm.has_data_node(ci):
                continue
            sm.add_node(O.DataNode(col_index=ci, label=col))
        return sm


if __name__ == "__main__":
    init_db("/Users/rook/workspace/sm-dev/data/home/databases/smc.db")
    table = Table.get_by_id(501)
    rows = list(
        TableRow.select().where(TableRow.table == table).order_by(TableRow.index)
    )

    assistant = MTabAssistant()
    resp = assistant.predict(table, rows)
    print(resp)
