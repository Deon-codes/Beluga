import xml.etree.ElementTree as ET

import merge_datasets as md


def test_ensure_split_dirs(tmp_path):
    md.ensure_split_dirs(tmp_path)
    for split in ("train", "val", "test"):
        assert (tmp_path / split / "images").is_dir()
        assert (tmp_path / split / "labels").is_dir()


def test_write_data_yaml(tmp_path):
    md.write_data_yaml(tmp_path)
    content = (tmp_path / "data.yaml").read_text()
    assert "nc: 17" in content
    assert "0: Pipeline" in content
    assert "16: Standing-bottle" in content


def test_remap_label_file_rewrites_class_ids(tmp_path):
    lbl = tmp_path / "a.txt"
    lbl.write_text("0 0.5 0.5 0.2 0.2\n1 0.1 0.1 0.05 0.05\n")
    out = md.remap_label_file(lbl, {0: 1, 1: 4})
    lines = out.splitlines()
    assert lines[0].split()[0] == "1"
    assert lines[1].split()[0] == "4"
    # non-class fields untouched
    assert lines[0].split()[1:] == ["0.5", "0.5", "0.2", "0.2"]


def test_remap_label_file_missing_file_returns_empty(tmp_path):
    assert md.remap_label_file(tmp_path / "missing.txt", {0: 1}) == ""


def test_remap_label_file_empty_file_returns_empty(tmp_path):
    lbl = tmp_path / "empty.txt"
    lbl.write_text("")
    assert md.remap_label_file(lbl, {0: 1}) == ""


def test_remap_label_file_skips_malformed_lines(tmp_path):
    lbl = tmp_path / "bad.txt"
    lbl.write_text("0 0.5 0.5 0.2 0.2\ngarbage line\n")
    out = md.remap_label_file(lbl, {0: 2})
    assert out.strip() == "2 0.5 0.5 0.2 0.2"


def test_random_split_proportions_and_no_overlap():
    items = list(range(100))
    train, val, test = md.random_split(items, train=0.8, val=0.1)
    assert len(train) == 80
    assert len(val) == 10
    assert len(test) == 10
    assert set(train) | set(val) | set(test) == set(items)
    assert not (set(train) & set(val))
    assert not (set(val) & set(test))
    assert not (set(train) & set(test))


def test_random_split_does_not_mutate_input():
    items = [1, 2, 3, 4, 5]
    original = items[:]
    md.random_split(items)
    assert items == original


def _write_watertank_xml(path, objects):
    root = ET.Element("annotation")
    filename = ET.SubElement(root, "filename")
    filename.text = "img.png"
    size = ET.SubElement(root, "size")
    ET.SubElement(size, "width").text = "200"
    ET.SubElement(size, "height").text = "100"
    for name, (x, y, w, h) in objects:
        obj = ET.SubElement(root, "object")
        ET.SubElement(obj, "name").text = name
        box = ET.SubElement(obj, "bndbox")
        ET.SubElement(box, "x").text = str(x)
        ET.SubElement(box, "y").text = str(y)
        ET.SubElement(box, "w").text = str(w)
        ET.SubElement(box, "h").text = str(h)
    ET.ElementTree(root).write(path)


def test_parse_watertank_xml_normalizes_and_remaps_class(tmp_path):
    xml_path = tmp_path / "a.xml"
    _write_watertank_xml(xml_path, [("Tire", (50, 25, 20, 10))])
    out = md.parse_watertank_xml(xml_path, img_w=200, img_h=100)
    class_id, xc, yc, w, h = out.split()
    assert int(class_id) == md.WATERTANK_CLASS_TO_UNIFIED_ID["Tire"]
    assert abs(float(xc) - (50 + 20 / 2) / 200) < 1e-6
    assert abs(float(yc) - (25 + 10 / 2) / 100) < 1e-6
    assert abs(float(w) - 20 / 200) < 1e-6
    assert abs(float(h) - 10 / 100) < 1e-6


def test_parse_watertank_xml_drops_wall_class(tmp_path):
    xml_path = tmp_path / "b.xml"
    _write_watertank_xml(xml_path, [("Wall", (0, 0, 10, 10)), ("Bottle", (10, 10, 5, 5))])
    out = md.parse_watertank_xml(xml_path, img_w=200, img_h=100)
    lines = out.splitlines()
    assert len(lines) == 1
    assert int(lines[0].split()[0]) == md.WATERTANK_CLASS_TO_UNIFIED_ID["Bottle"]


def test_parse_watertank_xml_no_debris_objects_returns_empty(tmp_path):
    xml_path = tmp_path / "c.xml"
    _write_watertank_xml(xml_path, [("Wall", (0, 0, 10, 10))])
    assert md.parse_watertank_xml(xml_path, img_w=200, img_h=100) == ""


def test_link_pair_creates_symlinks_and_prefixes_names(tmp_path):
    src_dir = tmp_path / "src"
    src_dir.mkdir()
    img_src = src_dir / "photo.jpg"
    img_src.write_bytes(b"fake-image-bytes")
    lbl_src = src_dir / "photo.txt"
    lbl_src.write_text("0 0.5 0.5 0.1 0.1\n")

    out_root = tmp_path / "out"
    md.ensure_split_dirs(out_root)
    md.link_pair(img_src, lbl_src, out_root, "train", "mine")

    img_dst = out_root / "train" / "images" / "mine__photo.jpg"
    lbl_dst = out_root / "train" / "labels" / "mine__photo.txt"
    assert img_dst.is_symlink()
    assert lbl_dst.is_symlink()
    assert img_dst.resolve() == img_src.resolve()


def test_link_pair_writes_empty_label_when_source_missing(tmp_path):
    src_dir = tmp_path / "src"
    src_dir.mkdir()
    img_src = src_dir / "bg.jpg"
    img_src.write_bytes(b"fake")

    out_root = tmp_path / "out"
    md.ensure_split_dirs(out_root)
    md.link_pair(img_src, src_dir / "bg.txt", out_root, "train", "subpipe")

    lbl_dst = out_root / "train" / "labels" / "subpipe__bg.txt"
    assert lbl_dst.exists()
    assert not lbl_dst.is_symlink()
    assert lbl_dst.read_text() == ""
