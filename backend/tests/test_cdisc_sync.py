"""Tests for CDISC sync service static methods and data utilities."""
from app.services.cdisc_sync_service import StandardType
from app.models.mapping_enums import SpecType


# ============================================================
# StandardType enum/class tests
# ============================================================

def test_standard_type_all():
    """StandardType.all() returns all 11 supported types."""
    types = StandardType.all()
    assert len(types) == 11
    assert "sdtm" in types
    assert "sdtmig" in types
    assert "adam" in types
    assert "adamig" in types
    assert "ct" in types
    assert "bc" in types


def test_standard_type_is_model():
    """StandardType.is_model_type identifies SDTM and ADaM."""
    assert StandardType.is_model_type("sdtm") is True
    assert StandardType.is_model_type("adam") is True
    assert StandardType.is_model_type("sdtmig") is False
    assert StandardType.is_model_type("ct") is False


def test_standard_type_is_ig():
    """StandardType.is_ig_type identifies IG standards."""
    assert StandardType.is_ig_type("sdtmig") is True
    assert StandardType.is_ig_type("adamig") is True
    assert StandardType.is_ig_type("cdashig") is True
    assert StandardType.is_ig_type("sendig") is True
    assert StandardType.is_ig_type("sdtm") is False


def test_standard_type_is_tig():
    """StandardType.is_tig_type identifies TIG standards."""
    assert StandardType.is_tig_type("tig") is True
    assert StandardType.is_tig_type("integrated") is True
    assert StandardType.is_tig_type("sdtm") is False


def test_standard_type_get_spec_type():
    """StandardType.get_spec_type maps to correct SpecType."""
    assert StandardType.get_spec_type("sdtm") == SpecType.SDTM
    assert StandardType.get_spec_type("sdtmig") == SpecType.SDTM
    assert StandardType.get_spec_type("adam") == SpecType.ADAM
    assert StandardType.get_spec_type("adamig") == SpecType.ADAM
    assert StandardType.get_spec_type("ct") is None
    assert StandardType.get_spec_type("bc") is None
    assert StandardType.get_spec_type("unknown") is None
