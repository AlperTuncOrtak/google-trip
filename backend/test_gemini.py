from types import SimpleNamespace as NS

import gemini


PROFILE = {"homeCity": {"name": "Warsaw"}, "activities": ["Street Food", "Nightlife"],
           "activitiesNote": "jazz bars", "diet": "halal"}


def test_profile_text_includes_everything():
    t = gemini.profile_text(PROFILE)
    assert "Street Food" in t and "Nightlife" in t and "jazz bars" in t and "halal" in t.lower()


def test_diet_rule_none_is_unrestricted():
    assert "no dietary restriction" in gemini.diet_rule("none").lower()
    assert "gluten-free" in gemini.diet_rule("gluten_free").lower()


def test_extract_sources_dedupes_place_citations():
    ann = lambda n, u: NS(type="place_citation", name=n, url=u)
    it = NS(steps=[
        NS(type="thinking", content=[]),
        NS(type="model_output", content=[
            NS(annotations=[ann("Osaka Castle", "https://maps/1"), ann("Osaka Castle", "https://maps/1")]),
            NS(annotations=None),
            NS(annotations=[ann("Kuromon Market", "https://maps/2"), NS(type="url_citation", name="x", url="y")]),
        ]),
    ])
    assert gemini.extract_sources(it) == [
        {"title": "Osaka Castle", "uri": "https://maps/1"},
        {"title": "Kuromon Market", "uri": "https://maps/2"},
    ]


def test_candidates_text_one_line_each():
    t = gemini.candidates_text([{"iata": "BCN", "city": "Barcelona", "countryName": "Spain", "priceUsd": 70.0}])
    assert t == "BCN | Barcelona, Spain | flight $70"
