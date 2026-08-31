# Model A - Unified Sonar Object Detector

YOLOv8s-based detector trained on a merged 17-class sonar/underwater dataset
(Sub_pipe pipelines, watertank debris, SeabedObjects-KLSG, mine detection).

## Performance (validation set, 6,329 images)
- Precision: 0.832
- Recall: 0.806
- mAP50: 0.832
- mAP50-95: 0.572

## Classes (17)
| ID | Class | ID | Class | ID | Class |
|----|-------|----|-------|----|-------|
| 0 | Pipeline | 6 | NOMBO | 12 | Valve |
| 1 | Aircraft | 7 | Tire | 13 | Propeller |
| 2 | Fish | 8 | Bottle | 14 | Hook |
| 3 | Other | 9 | Drink-carton | 15 | Shampoo-bottle |
| 4 | Shipwreck | 10 | Chain | 16 | Standing-bottle |
| 5 | MILCO | 11 | Can | | |

## Requirements
- Python 3.10+
- `pip install ultralytics` (this installs a matching PyTorch automatically)

Trained/exported with: Python 3.14.4, ultralytics 8.4.135, torch 2.13.0+cu130.
Any reasonably recent version of `ultralytics` should load this checkpoint
without issue.

## Usage

```python
from ultralytics import YOLO

model = YOLO("model_a_unified_v2.pt")

# Single image
results = model.predict("path/to/sonar_image.png", conf=0.25)
results[0].show()          # display with boxes drawn
results[0].save("out.png") # or save to file

# Batch / folder of images
results = model.predict("path/to/folder/", conf=0.25)

# Access detections programmatically
for box in results[0].boxes:
    cls_id = int(box.cls)
    conf = float(box.conf)
    xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
    print(model.names[cls_id], conf, xyxy)
```

GPU is used automatically if available (`torch.cuda.is_available()`); otherwise
falls back to CPU (slower, but works).

## Notes
- Input images are sonar scans (mix of pipeline, seabed object, and debris
  imagery). Class names and count are embedded in the checkpoint -- no
  external config file is needed to run inference.
- This is the fine-tuned version (`model_a_unified_v2`), corrected after a
  tile-overlap bug in the original Pipeline training data was found and fixed
  (see project history for details).
