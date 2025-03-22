from osxmetadata import OSXMetaData, Tag, FINDER_COLOR_NONE

class TagsWrangler:

    def get_tags_for_images(self, image_paths: list[str]) -> dict[str, list[str]]:
        return {p: self.get_tags(p) for p in image_paths}

    def get_tags(self, image_path: str) -> list[str]:
        md = OSXMetaData(image_path)
        return [t.name for t in md.tags]

    def add_tag(self, image_path, tag_name):
        md = OSXMetaData(image_path)
        if any(tag.name == tag_name for tag in md.tags):
            return False
        md.tags = md.tags + [Tag(name=tag_name, color=FINDER_COLOR_NONE)]
        return True

    def remove_tag(self, image_path, tag_name):
        md = OSXMetaData(image_path)
        md.tags = [t for t in md.tags if t.name != tag_name]



