# Fuzzy-String-Search

Implemented Hirschberg's algorithm for finding the Leveinstein distance between strings.

Given a keyword, the API will find the top three matches in a keyword database of Firestore.

API Functions:

GET: api/keywords
Return all keywords in the following format
Return Format:
[{
  "id": "UniqueStringID",
  "kw": ["AlphanumericOr-_",...],
  "data": "Any String",
  },
  ...
]
Note all fields are mandatory

GET: api/match/:kw
Return the top three matching keywords
Return Format:
[{
  "id": "UniqueStringID",
  "kw": ["AlphanumericOr-_Only",...],
  "data": "Any String"
  }, or NULL
  ...
]
Note all fields are mandatory

GET: api/match-exact/:kw
Return an exact match, if possible
Return Format:
{
  "id": "UniqueStringID",
  "kw": ["AlphanumericOr-_Only",...],
  "data": "Any String",
  }, or NULL
Note all fields are mandatory

POST: api/add
Add the an entry from req body to the database
Req body format:
{
  "kw": ["AlphanumericOr-_Only",...],
  "data": "Any String",
}
Note all fields are mandatory

POST: /api/add-batch
Add an array of entries to database
Req body format:
[{
  "kw": ["AlphanumericOr-_",...],
  "data": "Any String",
  },
  ...
]
Note all fields are mandatory

PUT: api/update/:id
Update an entry by its ID
Req body format:
{
  "addKw": ["KeywordsToAdd", "AlphanumericOr-_Only", ...],
  "removeKw": ["KeywordsToRemove", "AlphanumericOr-_Only", ...],
  "ovData": "Overide data with this new string",
}
Note all fields are optional

DELETE: /api/delete/:id
Delete the entry with said ID
