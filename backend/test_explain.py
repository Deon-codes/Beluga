from app.pipeline.explain import generate_heatmap_base64
from pathlib import Path
import traceback
try:
    generate_heatmap_base64(Path('storage/SUR-1F94D085/0020_2021.jpg'), 5)
    print("Success")
except Exception as e:
    traceback.print_exc()
