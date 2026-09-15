from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_validator

Diet = Literal["none", "vegetarian", "vegan", "halal", "gluten_free"]


class City(BaseModel):
    name: str
    iata: str
    countryCode: str
    countryName: str = ""
    currency: str


class Profile(BaseModel):
    homeCity: City
    activities: list[str] = []
    activitiesNote: str = ""
    diet: Diet = "none"

    @model_validator(mode="after")
    def need_activity(self):
        if not self.activities and not self.activitiesNote.strip():
            raise ValueError("pick at least one activity")
        return self


class Trip(BaseModel):
    budget: float = Field(gt=0)  # home currency
    departDate: date
    returnDate: date
    travelers: int = Field(ge=1, le=9)

    @model_validator(mode="after")
    def dates_in_order(self):
        if self.returnDate <= self.departDate:
            raise ValueError("returnDate must be after departDate")
        return self


class SuggestRequest(BaseModel):
    profile: Profile
    trip: Trip


class CityRef(BaseModel):
    name: str
    iata: str
    reason: str = ""


class PlanRequest(BaseModel):
    profile: Profile
    trip: Trip
    countryCode: str = Field(min_length=2, max_length=2)
    city: CityRef | None = None
