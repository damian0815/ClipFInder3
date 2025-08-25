from osxmetadata import OSXMetaData

def get_tags(path):
    try:
        md = OSXMetaData(path)
        return [t[0] for t in md.tags]
    except FileNotFoundError:
        return []



