import math
from typing import List, Optional, Tuple
from app.models.schemas import DetectionResult, SurveyMetadata, GeoTag

EARTH_RADIUS_M = 6_371_000.0  # WGS84 mean spherical radius

def compute_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate initial bearing in degrees (0 to 360) from point 1 to point 2.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)

    bearing_rad = math.atan2(y, x)
    bearing_deg = (math.degrees(bearing_rad) + 360.0) % 360.0
    return bearing_deg

def geodesic_project(lat: float, lon: float, bearing_deg: float, distance_m: float) -> Tuple[float, float]:
    """
    Project point (lat, lon) by distance_m along bearing_deg (degrees clockwise from North).
    Uses spherical approximation (accurate within millimetres for distances < 2km).
    """
    if abs(distance_m) < 1e-7:
        return lat, lon

    delta = distance_m / EARTH_RADIUS_M
    theta = math.radians(bearing_deg)

    phi1 = math.radians(lat)
    lambda1 = math.radians(lon)

    sin_phi1 = math.sin(phi1)
    cos_phi1 = math.cos(phi1)
    sin_delta = math.sin(delta)
    cos_delta = math.cos(delta)

    phi2 = math.asin(sin_phi1 * cos_delta + cos_phi1 * sin_delta * math.cos(theta))
    lambda2 = lambda1 + math.atan2(
        math.sin(theta) * sin_delta * cos_phi1,
        cos_delta - sin_phi1 * math.sin(phi2)
    )

    return math.degrees(phi2), math.degrees(lambda2)

def geotag_detections(
    detections: List[DetectionResult],
    metadata: Optional[SurveyMetadata],
    image_width_px: int,
    image_height_px: int,
) -> List[DetectionResult]:
    """
    Mutate DetectionResult.location in-place for all detections based on survey metadata.
    If dual anchors (anchor_start, anchor_end) are provided:
      1. Interpolate along-track position P(alpha) along trajectory (alpha = y_center / height)
      2. Calculate swath baseline bearing and across-track offset (x_center - width/2) * mpp
      3. Project P(alpha) orthogonal to trajectory (bearing + 90 deg)
      4. Set geo_confidence = "measured"
    Otherwise:
      Set geo_confidence = "none"
    """
    if not detections:
        return detections

    if metadata is None or metadata.anchor_start is None or metadata.anchor_end is None:
        for d in detections:
            d.location = GeoTag(lat=None, lon=None, geo_confidence="none")
        return detections

    start_lat = metadata.anchor_start.lat
    start_lon = metadata.anchor_start.lon
    end_lat = metadata.anchor_end.lat
    end_lon = metadata.anchor_end.lon

    track_bearing = compute_bearing(start_lat, start_lon, end_lat, end_lon)
    across_bearing = (track_bearing + 90.0) % 360.0  # Starboard positive (+x)

    mpp = metadata.meters_per_pixel if metadata.meters_per_pixel > 0 else 0.05
    nadir_x = image_width_px / 2.0

    for d in detections:
        cx = (d.bbox_px.x1 + d.bbox_px.x2) / 2.0
        cy = (d.bbox_px.y1 + d.bbox_px.y2) / 2.0

        # Along-track interpolation
        alpha = cy / float(image_height_px) if image_height_px > 0 else 0.0
        alpha = max(0.0, min(1.0, alpha))

        pivot_lat = start_lat + alpha * (end_lat - start_lat)
        pivot_lon = start_lon + alpha * (end_lon - start_lon)

        # Across-track offset in meters
        offset_m = (cx - nadir_x) * mpp

        # Orthogonal projection
        target_lat, target_lon = geodesic_project(
            lat=pivot_lat,
            lon=pivot_lon,
            bearing_deg=across_bearing,
            distance_m=offset_m
        )

        d.location = GeoTag(
            lat=round(target_lat, 7),
            lon=round(target_lon, 7),
            geo_confidence="measured"
        )

    return detections
