"""Request and response contracts for POST /api/evidence."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CabinInputs(BaseModel):
    gravity_g: float = Field(ge=0, le=1)
    o2_percent: float = Field(ge=10, le=100)
    pressure_psi: float = Field(ge=3, le=15)
    airflow_cm_s: float = Field(ge=0, le=40)
    diluent: Literal["N2", "CO2", "He"]
    fuel_material: Literal[
        "PMMA_Acrylic", "Cotton_Fabric", "Kapton_Wire", "Heptane_Droplet", "Methane_Gas"
    ]


class EvidenceContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    material: str | None = None
    geometry: str | None = None
    flow_configuration: str | None = None
    apparatus: str | None = None
    metric: str | None = None


class EvidenceQuery(BaseModel):
    cabin: CabinInputs
    context: EvidenceContext | None = None


class SourceReference(BaseModel):
    source_id: str
    locator: str
    pdf_page: int | None
    printed_page: int | None


class MatchReason(BaseModel):
    field: str
    requested: str | None
    reported: str | list[str] | None


class MatchReasons(BaseModel):
    matching: list[MatchReason]
    missing: list[MatchReason]
    conflicting: list[MatchReason]


Dimension = Literal["gravity_g", "o2_percent", "pressure_psi", "airflow_cm_s"]
FieldStatus = Literal["measured", "derived_from_measurements", "reported_nominal", "assumed", "missing"]


class ConditionComparison(BaseModel):
    dimension: Dimension
    selected: float
    reported: float | tuple[float, float]
    original: float | tuple[float, float] | str | bool | None
    original_unit: str
    normalized: float | tuple[float, float]
    unit: str
    factor: float
    delta: float
    status: FieldStatus
    basis: str
    time: str
    approximate: bool
    source: SourceReference | None


class EvidenceMatch(BaseModel):
    id: str
    reasons: MatchReasons
    compared: list[ConditionComparison]
    missing_dimensions: list[Dimension]
    distance: float | None


class MatchGroups(BaseModel):
    compatible: list[EvidenceMatch]
    compatibility_unknown: list[EvidenceMatch]
    incompatible: list[EvidenceMatch]


class MetricCoverage(BaseModel):
    compatible_measured: int
    compatible_derived: int
    partial_context: int
    incompatible: int


class Coverage(BaseModel):
    metrics: dict[str, MetricCoverage]
    condition_only: list[str]
    specimen_groups: dict[str, list[str]]


class EvidenceResponse(BaseModel):
    catalog_version: str
    ranking_version: int
    groups: MatchGroups
    coverage: Coverage
