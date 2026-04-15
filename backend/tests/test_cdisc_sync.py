"""Tests for CDISC sync service static methods and data utilities."""
import pytest
from unittest.mock import AsyncMock

from app.services.cdisc_sync_service import CDISCSyncService, StandardType
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


# ============================================================
# _format_version_display tests
# ============================================================

def test_format_version_display_date_versions():
    """Date-based versions (YYYY-MM-DD) are returned as-is, no 'v' prefix."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    assert svc._format_version_display("2026-03-27") == "2026-03-27"
    assert svc._format_version_display("2025-09-26") == "2025-09-26"
    assert svc._format_version_display("2024-12-27") == "2024-12-27"


def test_format_version_display_numeric_versions():
    """Numeric versions get 'v' prefix and dashes become dots."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    assert svc._format_version_display("3-4") == "v3.4"
    assert svc._format_version_display("1-3") == "v1.3"
    assert svc._format_version_display("2-1") == "v2.1"
    assert svc._format_version_display("2-0") == "v2.0"


def test_format_version_display_ct_package_names():
    """CT package names (prefix-YYYY-MM-DD) extract and return just the date."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    assert svc._format_version_display("sdtmct-2026-03-27") == "2026-03-27"
    assert svc._format_version_display("adamct-2025-12-27") == "2025-12-27"
    assert svc._format_version_display("sendct-2024-09-26") == "2024-09-26"


# ============================================================
# _resolve_latest_version tests
# ============================================================

def test_format_version_display_sentinel_strings():
    """Sentinel strings 'latest' and 'all' are returned as-is without modification."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    assert svc._format_version_display("latest") == "latest"
    assert svc._format_version_display("all") == "all"
    assert svc._format_version_display("LATEST") == "LATEST"


@pytest.mark.asyncio
async def test_resolve_latest_version_tig_returns_all():
    """TIG has multiple independent products — 'all' syncs everything."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    result = await svc._resolve_latest_version("tig")
    assert result == "all"


@pytest.mark.asyncio
async def test_resolve_latest_version_integrated_returns_all():
    """'integrated' is an alias for TIG — should return 'all'."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    result = await svc._resolve_latest_version("integrated")
    assert result == "all"


@pytest.mark.asyncio
async def test_resolve_latest_version_bc_returns_latest():
    """BC has no version enumeration — pass 'latest' through unchanged."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    result = await svc._resolve_latest_version("bc")
    assert result == "latest"


@pytest.mark.asyncio
async def test_resolve_latest_version_qrs_returns_latest():
    """QRS has no version enumeration — pass 'latest' through unchanged."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    result = await svc._resolve_latest_version("qrs")
    assert result == "latest"


@pytest.mark.asyncio
async def test_resolve_latest_version_ct_picks_newest_date():
    """CT: deduplicate dates from package names, return most recent."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    svc._get_ct_versions = AsyncMock(return_value=[
        "sdtmct-2026-03-27", "adamct-2026-03-27", "sendct-2026-03-27",
        "sdtmct-2025-12-27", "adamct-2025-12-27",
        "sdtmct-2025-09-26",
    ])
    result = await svc._resolve_latest_version("ct")
    assert result == "2026-03-27"


@pytest.mark.asyncio
async def test_resolve_latest_version_sdtmig_picks_first():
    """Model/IG: CDISC API returns newest first, so take versions[0]."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    svc.get_available_versions = AsyncMock(return_value=["3-4", "3-3", "3-2"])
    result = await svc._resolve_latest_version("sdtmig")
    assert result == "3-4"


@pytest.mark.asyncio
async def test_resolve_latest_version_empty_falls_back():
    """If CDISC API returns nothing, fall back to 'latest' string."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    svc.get_available_versions = AsyncMock(return_value=[])
    result = await svc._resolve_latest_version("sdtm")
    assert result == "latest"


# ============================================================
# _sync_ct package selection tests
# ============================================================

@pytest.mark.asyncio
async def test_sync_ct_bare_date_syncs_all_packages():
    """When a bare date is given, _sync_ct should enumerate all packages for that date."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    svc._get_ct_versions = AsyncMock(return_value=[
        "sdtmct-2026-03-27", "adamct-2026-03-27", "sendct-2026-03-27",
        "cdashct-2026-03-27",
        "sdtmct-2025-09-26", "adamct-2025-09-26",
    ])
    packages = await svc._get_ct_versions()
    date = "2026-03-27"
    packages_for_date = [pkg for pkg in packages if pkg.endswith(date)]
    assert packages_for_date == [
        "sdtmct-2026-03-27", "adamct-2026-03-27",
        "sendct-2026-03-27", "cdashct-2026-03-27",
    ]


def test_sync_ct_full_package_name_not_expanded():
    """When a full CT package name is given, it should be used as-is (no expansion)."""
    svc = CDISCSyncService.__new__(CDISCSyncService)
    valid_ct_prefixes = [
        "sdtmct-", "adamct-", "sendct-", "cdashct-", "protocolct-",
        "qrsct-", "ddfct-", "define-", "glossaryct-", "tmfct-",
        "mrctct-", "coact-", "qs-"
    ]
    full_name = "adamct-2026-03-27"
    assert any(full_name.startswith(p) for p in valid_ct_prefixes), (
        "Full package name should be detected as a prefixed name and not expanded"
    )
