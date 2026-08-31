import fl_setup_clients as fsc


def _make_source_tree(root):
    train_img = root / "train" / "images"
    train_lbl = root / "train" / "labels"
    val_img = root / "val" / "images"
    train_img.mkdir(parents=True)
    train_lbl.mkdir(parents=True)
    val_img.mkdir(parents=True)

    for prefix, count in {"subpipe__": 3, "klsg__": 2}.items():
        for i in range(count):
            img = train_img / f"{prefix}{i}.jpg"
            img.write_bytes(b"fake")
            (train_lbl / f"{prefix}{i}.txt").write_text("0 0.5 0.5 0.1 0.1\n")
    return root


def test_setup_clients_partitions_by_prefix(tmp_path):
    src = _make_source_tree(tmp_path / "src")
    clients_root = tmp_path / "clients"
    prefixes = {"subpipe": "subpipe__", "klsg": "klsg__"}

    counts = fsc.setup_clients(src_root=src, clients_root=clients_root, prefixes=prefixes, verbose=False)

    assert counts == {"subpipe": 3, "klsg": 2}
    subpipe_imgs = list((clients_root / "subpipe" / "train" / "images").glob("*"))
    assert len(subpipe_imgs) == 3
    for img in subpipe_imgs:
        assert img.is_symlink()

    klsg_imgs = list((clients_root / "klsg" / "train" / "images").glob("*"))
    assert len(klsg_imgs) == 2
    # cross-contamination check: klsg client must not see subpipe images
    assert all("klsg__" in p.name for p in klsg_imgs)


def test_setup_clients_writes_valid_data_yaml(tmp_path):
    src = _make_source_tree(tmp_path / "src")
    clients_root = tmp_path / "clients"
    fsc.setup_clients(src_root=src, clients_root=clients_root, prefixes={"subpipe": "subpipe__"}, verbose=False)

    yaml_text = (clients_root / "subpipe" / "data.yaml").read_text()
    assert "nc: 17" in yaml_text
    assert "train: train/images" in yaml_text
    assert str(src / "val" / "images") in yaml_text


def test_setup_clients_is_idempotent(tmp_path):
    src = _make_source_tree(tmp_path / "src")
    clients_root = tmp_path / "clients"
    prefixes = {"subpipe": "subpipe__"}

    first = fsc.setup_clients(src_root=src, clients_root=clients_root, prefixes=prefixes, verbose=False)
    second = fsc.setup_clients(src_root=src, clients_root=clients_root, prefixes=prefixes, verbose=False)
    assert first == second == {"subpipe": 3}


def test_setup_clients_missing_label_skips_link_but_still_counts(tmp_path):
    src = _make_source_tree(tmp_path / "src")
    # remove one label to simulate a background tile with no annotation
    (src / "train" / "labels" / "subpipe__0.txt").unlink()
    clients_root = tmp_path / "clients"

    counts = fsc.setup_clients(
        src_root=src, clients_root=clients_root, prefixes={"subpipe": "subpipe__"}, verbose=False
    )
    assert counts["subpipe"] == 3
    lbl_dir = clients_root / "subpipe" / "train" / "labels"
    assert not (lbl_dir / "subpipe__0.txt").exists()
    assert (lbl_dir / "subpipe__1.txt").exists()
