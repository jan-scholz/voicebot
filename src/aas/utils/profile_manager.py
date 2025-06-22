import json
from collections import defaultdict

PROMPT_TEMPLATE = """\
You are a friendly, helpful, and empathetic assistant acting as a personal support worker.
Your task is to provide assistance and companionship with your user named {name}.
You emotional tone when interacting with {name} your tone should be {emotional_tone}.

Here is the information about {name} you should keep in mind in your responses:
- {name} has the following daily routine: {daily_routine}.
- {name} has the following family interactions: {family_notes}.
- {name} has the following reminders: {reminders}.

Bear in mind that you are a virtual assistant. Do not offer to perform physical tasks, or provide reminders.
You can provide companionship, and emotional support.

If the user asks for help with a task, you should respond with empathy and suggest alternatives that do not require physical action.X
"""


class ProfileManager:
    def __init__(self):
        self.profiles = {}
        self.name_to_ids_map = defaultdict(list)
        self.prompt_cache = {}

    def load_profiles(self, json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            profiles = json.load(f)
            self.add_profiles(profiles)

    def add_profiles(self, profiles: list[dict]):
        for profile in profiles:
            if profile["id"] in self.profiles:
                raise KeyError(f"Profile ID \"{profile['id']}\" already exists.")
            self.profiles[profile["id"]] = profile
            self.name_to_ids_map[profile["name"]].append(profile["id"])

    def name_to_ids(self, name: str):
        if not name in self.name_to_ids_map:
            raise ValueError(f'No profile for name "{name}".')
        return self.name_to_ids_map[name]

    def get_prompt_by_name(self, name: str):
        ids = self.name_to_ids(name)
        if len(ids) > 1:
            raise ValueError(
                f'There are multiple ({len(ids)}) profiles under name "{name}".'
            )
        return self.get_prompt_by_id(ids[0])

    def get_prompt_by_id(self, profile_id):
        """Generate the final prompt from the JSON user profile and the template."""
        if not profile_id in self.profiles:
            raise ValueError(f'No profile for id "{profile_id}".')
        if profile_id in self.prompt_cache:
            return self.prompt_cache[profile_id]
        else:
            prompt = PROMPT_TEMPLATE.format(**self.profiles[profile_id])
            self.prompt_cache[profile_id] = prompt
            return prompt

    def update_prompt_cache(self, profile_id, prompt):
        if not profile_id in self.profiles:
            raise ValueError(f'No profile for id "{profile_id}".')
        self.prompt_cache[profile_id] = prompt

    def list_profile_ids_and_names(self):
        return [{"id": k, "name": v["name"]} for k, v in self.profiles.items()]

    def __repr__(self):
        nprofiles = 0
        if self.profiles:
            nprofiles = len(self.profiles)
        return f"{self.__class__.__name__}, {nprofiles} profile loaded."


def main():
    pm = ProfileManager()
    print(pm)
    pm.load_profiles("user_profile.json")
    print(pm)
    print("====================")
    print(pm.get_prompt_by_id("elanor@example.com")[:200])
    print("====================")
    print(pm.get_prompt_by_name("Simeon")[:200])
    print("==== cache =========")
    print(pm.get_prompt_by_name("Simeon")[:200])
    print("====================")
    print(pm.list_profile_ids_and_names())
    print("==== update cache ======")
    pm.update_prompt_cache("simeon@example.com", "new prompt")
    print(pm.get_prompt_by_name("Simeon")[:200])


if __name__ == "__main__":
    main()
