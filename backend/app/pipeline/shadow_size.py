from typing import Optional
from app.models.schemas import BoundingBox, MetricDimensions, SurveyMetadata

def compute_metric_dimensions(
    bbox: BoundingBox,
    metadata: Optional[SurveyMetadata],
    image_width_px: int,
) -> MetricDimensions:
    """
    Compute real-world metric dimensions (length, width, height) in meters.
    - Footprint:
        length_m = (y2 - y1) * meters_per_pixel
        width_m = (x2 - x1) * meters_per_pixel
    - Acoustic Shadow Height (if altitude is provided):
        H = (L_s * A) / (R_s + L_s)
        where:
            L_s = shadow length in meters (approximated by across-track bbox width)
            A   = sonar_altitude_m (altitude of sonar towfish above seabed)
            R_s = slant range distance in meters from nadir line to object
    """
    mpp = 0.05
    if metadata and metadata.meters_per_pixel and metadata.meters_per_pixel > 0:
        mpp = metadata.meters_per_pixel

    bbox_w_px = max(0.0, bbox.x2 - bbox.x1)
    bbox_h_px = max(0.0, bbox.y2 - bbox.y1)

    width_m = round(bbox_w_px * mpp, 3)
    length_m = round(bbox_h_px * mpp, 3)

    height_m: Optional[float] = None

    if metadata and metadata.sonar_altitude_m is not None and metadata.sonar_altitude_m > 0:
        nadir_x = image_width_px / 2.0
        cx = (bbox.x1 + bbox.x2) / 2.0
        slant_range_px = max(1.0, abs(cx - nadir_x))
        
        # L_s is acoustic shadow span (approximated by bounding box cross-section)
        shadow_len_px = max(1.0, bbox_w_px)
        
        altitude_m = metadata.sonar_altitude_m
        # Shadow height formula: H = (L_s * A) / (R_s + L_s)
        calc_h = (shadow_len_px * altitude_m) / (slant_range_px + shadow_len_px)
        height_m = round(float(calc_h), 3)

    return MetricDimensions(
        length_m=length_m,
        width_m=width_m,
        height_m=height_m
    )
