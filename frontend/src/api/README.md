# Frontend API Layer

This directory contains the frontend API layer that provides clean, encapsulated access to backend services.

## Structure

- `tags.ts` - Tag-related API functions
- `search.ts` - Search-related API functions  
- `index.ts` - Main exports for easy importing

## API Functions

### Tags API (`tags.ts`)

#### `getImageIdsForTags(tags: string[]): Promise<string[]>`
Fetches image IDs that have ALL of the specified tags.

**Backend Endpoint**: `POST /api/images/by-tags`
**Payload**:
```json
{
  "tags": ["tag1", "tag2"],
  "match_all": true
}
```

#### `getImageIdsForTagsOr(tags: string[]): Promise<string[]>`
Fetches image IDs that have ANY of the specified tags.

**Backend Endpoint**: `POST /api/images/by-tags`
**Payload**:
```json
{
  "tags": ["tag1", "tag2"], 
  "match_all": false
}
```

#### `getAllTags(): Promise<string[]>`
Fetches all available tags in the system.

**Backend Endpoint**: `GET /api/allKnownTags`
**Response**:
```json
{
  "all_known_tags": ["tag1", "tag2", "tag3"]
}
```

#### `getTagsForImage(imageId: string): Promise<string[]>`
Fetches tags for a specific image.

**Backend Endpoint**: `GET /api/tags/{imageId}`
**Response**:
```json
{
  "tags": ["tag1", "tag2"]
}
```

### Search API (`search.ts`)

#### `performSearch(searchParams: SearchParams): Promise<SearchResult[]>`
Performs a semantic search with multiple embedding inputs.

**Backend Endpoint**: `POST /api/search`
**Payload**:
```json
{
  "texts": ["search text"],
  "image_ids": ["image123"],
  "tags": [["tag1", "tag2"]],
  "weights": [1.0, 0.8, 1.2],
  "path_contains": ["path/filter"],
  "excluded_image_ids": ["exclude123"],
  "required_image_ids": ["require456"]
}
```

## Usage Examples

### Import API functions

```typescript
// Import individual functions
import { getImageIdsForTags, getAllTags } from '@/api/tags';
import { performSearch } from '@/api/search';

// Or import everything
import * as API from '@/api';
```

### Using the tag APIs

```typescript
// Get images that have all specified tags
const imageIds = await getImageIdsForTags(['nature', 'landscape']);

// Get all available tags
const allTags = await getAllTags();

// Get tags for a specific image
const imageTags = await getTagsForImage('image123');
```

### Using the search API

```typescript
const searchParams = {
  texts: ['beautiful sunset'],
  image_ids: ['example_image_id'],
  weights: [1.0, 0.5],
  path_contains: ['vacation_photos']
};

const results = await performSearch(searchParams);
```

## Error Handling

All API functions include proper error handling and will:
- Log errors to the console
- Throw the error for the calling code to handle
- Return empty arrays for non-critical failures where appropriate

## Type Safety

The API layer is fully typed with TypeScript interfaces:
- `SearchParams` - Parameters for search requests
- `SearchResult` - Structure of search results
- All functions have proper return type annotations
