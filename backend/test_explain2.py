from app.pipeline.detect import run_detection
from app.pipeline.explain import generate_heatmap_base64
from pathlib import Path
import traceback

p = Path('app/storage/SUR-1F94D085/0020_2021.jpg')
print("Running detection...")
run_detection(p)
print("Detection finished.")

try:
    res = generate_heatmap_base64(p, 5)
    print("Success! Generated heatmap length:", len(res))
except Exception as e:
    traceback.print_exc()
