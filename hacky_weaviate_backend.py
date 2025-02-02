from time import sleep
import weaviate

persistence_data_path = './weaviate_data'
weaviate_client = weaviate.connect_to_embedded(
    version="1.26.5",
    persistence_data_path=persistence_data_path
)

while True:
    sleep(1)

