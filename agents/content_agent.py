import logging
from typing import Any

logger = logging.getLogger("ContentAgent")

DESCRIPTIONS = {
    "mona-lisa": {
        "short": "The world's most famous portrait, celebrated for her enigmatic smile.",
        "long": "Leonardo da Vinci's Mona Lisa is arguably the most recognized painting in the world. Painted between 1503 and 1519, this portrait of Lisa Gherardini showcases Leonardo's revolutionary sfumato technique — layers of translucent glazes creating soft transitions between light and shadow. The subject's mysterious smile has fascinated viewers for over five centuries.",
        "audio_narration": "Before you stands the Mona Lisa, painted by Leonardo da Vinci around 1503. Notice how her smile seems to change as you move — this is the magic of sfumato. The painting measures just 77 by 53 centimeters, yet its cultural impact is immeasurable.",
        "tags": ["portrait", "Renaissance", "sfumato", "Italian"],
        "highlight": True,
    },
    "starry-night": {
        "short": "Van Gogh's swirling nocturnal vision, painted from an asylum window.",
        "long": "Painted in June 1889, The Starry Night depicts the view from Van Gogh's east-facing window at the Saint-Paul-de-Mausole asylum in Saint-Remy-de-Provence. The painting captures the night sky with tumultuous swirls of blue and yellow, a village below, and a towering cypress tree reaching toward the heavens.",
        "audio_narration": "This is Van Gogh's Starry Night, painted in 1889 while he was a patient at an asylum in southern France. Look at the sky — those spiraling waves of blue and gold were not what Van Gogh literally saw, but what he felt.",
        "tags": ["landscape", "Post-Impressionism", "night sky", "swirling"],
        "highlight": True,
    },
    "girl-pearl-earring": {
        "short": "Vermeer's 'Mona Lisa of the North' — a luminous tronie of mystery.",
        "long": "Girl with a Pearl Earring is one of Vermeer's most iconic works, often called the 'Mona Lisa of the North.' Painted around 1665, it is not a portrait but a tronie — a Dutch Golden Age study of expression and costume. The girl's exotic turban, luminous pearl, and turned gaze create an unforgettable image of intimate beauty.",
        "audio_narration": "This is Vermeer's Girl with a Pearl Earring, painted around 1665. Notice how she seems to look directly at you — this captured moment gives the painting its incredible intimacy.",
        "tags": ["tronie", "Baroque", "pearl", "Dutch"],
        "highlight": True,
    },
    "great-wave": {
        "short": "Hokusai's iconic woodblock print of nature's terrible power.",
        "long": "The Great Wave off Kanagawa is the most famous work of Japanese art, created by Katsushika Hokusai around 1831 as part of his series Thirty-six Views of Mount Fuji. The print depicts enormous waves threatening boats off the coast of Kanagawa, with Mount Fuji small in the background.",
        "audio_narration": "Hokusai's Great Wave is perhaps the most reproduced image in all of Japanese art. Notice Mount Fuji in the background — tiny and serene, dwarfed by the towering wave. The Prussian blue pigment was new to Japan, giving the work its distinctive color.",
        "tags": ["ukiyo-e", "woodblock", "wave", "Japanese"],
        "highlight": True,
    },
}

GENERIC_TEMPLATE = {
    "tags": [],
    "highlight": False,
}

class ContentAgent:
    async def enrich(self, artwork: dict) -> dict:
        art_id = artwork["id"]
        movement = artwork.get("movement", "")
        artist = artwork.get("artist", "")
        title = artwork.get("title", "")
        year = artwork.get("year", "")
        medium = artwork.get("medium", "")
        museum = artwork.get("museum", "")

        if art_id in DESCRIPTIONS:
            desc = DESCRIPTIONS[art_id]
        else:
            desc = {
                "short": f"A masterpiece of {movement} by {artist}.",
                "long": f"{title}, created by {artist} in {year}, is a seminal work of the {movement} movement. Painted in {medium}, this work is housed at {museum}.",
                "audio_narration": f"This is {title} by {artist}, created in {year}. A notable example of {movement}, this {medium} work can be found at {museum}.",
                "tags": [],
                "highlight": False,
            }

        artwork["description"] = desc["short"]
        artwork["description_long"] = desc["long"]
        artwork["audio_narration"] = desc["audio_narration"]
        artwork["tags"] = desc["tags"]
        artwork["highlight"] = desc["highlight"]
        return artwork
