from sm_datasets.datasets import Datasets


def load(dataset: str):
    return Datasets().get_dataset(dataset)
