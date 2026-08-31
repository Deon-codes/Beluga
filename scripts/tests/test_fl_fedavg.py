import torch

import fl_fedavg as fl


def test_fedavg_equal_weights_averages_correctly():
    sd_a = {"w": torch.tensor([2.0, 4.0])}
    sd_b = {"w": torch.tensor([4.0, 8.0])}
    result = fl.fedavg([sd_a, sd_b], weights=[1, 1])
    assert torch.allclose(result["w"], torch.tensor([3.0, 6.0]))


def test_fedavg_weighted_by_client_size():
    sd_a = {"w": torch.tensor([0.0])}
    sd_b = {"w": torch.tensor([10.0])}
    # client b has 9x the data of client a -> result should skew heavily toward b
    result = fl.fedavg([sd_a, sd_b], weights=[1, 9])
    assert torch.allclose(result["w"], torch.tensor([9.0]))


def test_fedavg_preserves_original_dtype():
    sd_a = {"w": torch.tensor([1, 3], dtype=torch.int64)}
    sd_b = {"w": torch.tensor([3, 5], dtype=torch.int64)}
    result = fl.fedavg([sd_a, sd_b], weights=[1, 1])
    assert result["w"].dtype == torch.int64
    assert torch.equal(result["w"], torch.tensor([2, 4], dtype=torch.int64))


def test_fedavg_preserves_all_keys():
    sd_a = {"conv.weight": torch.zeros(3), "conv.bias": torch.ones(2)}
    sd_b = {"conv.weight": torch.ones(3) * 2, "conv.bias": torch.ones(2) * 3}
    result = fl.fedavg([sd_a, sd_b], weights=[1, 1])
    assert set(result.keys()) == {"conv.weight", "conv.bias"}
    assert torch.allclose(result["conv.bias"], torch.tensor([2.0, 2.0]))


def test_fasttrainer_validate_returns_empty_metrics_and_none_fitness():
    # validate() must return ({}, None) not (None, None) -- BaseTrainer unpacks
    # {**self.metrics} unconditionally, which crashes on None (see fl_fedavg.py
    # docstring on FastTrainer for the empirically-hit bug this guards against).
    metrics, fitness = fl.FastTrainer.validate(object.__new__(fl.FastTrainer))
    assert metrics == {}
    assert fitness is None
