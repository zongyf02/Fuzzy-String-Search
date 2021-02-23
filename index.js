const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.json());
const Joi = require("joi");
const functions = require("firebase-functions");
const cors = require("cors");
app.use(cors({origin: true}));

// Boilerplate
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
// const {firebaseConfig} = require("firebase-functions");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fuzzysearch-46fc8-default-rtdb.firebaseio.com",
});
const db = admin.firestore();

/**
 * Cost of inserting or deleting a char
 * @param {String} c character
 * @return {Number} cost
 */
function indel(c) {
  return 1;
}

/**
 * ost of replacing a char by another
 * @param {String} c1 character
 * @param {String} c2 character
 * @return {Number} cost
 */
function sub(c1, c2) {
  if (c1 === c2) {
    return 0;
  } else {
    return 1;
  }
}

/**
 * Return a copy of a reversed str
 * @param {String} str string to be reversed
 * @return {String}
 */
function reverse(str) {
  return str.split("").reverse().join("");
}

/**
 * Return the last row of the Needleman-Wunsh matrix
 * @param {String} str1
 * @param {String} str2
 * @return {Array}
 */
function nw(str1, str2) {
  // Declare the rows for DP
  let row1 = new Array(str2.length + 1);
  let row2 = new Array(row1.length);

  // Initialize row1
  row1[0] = 0;
  for (let i = 1; i <= str2.length; ++i) {
    row1[i] = row1[i - 1] + indel(str2.charAt(i - 1));
  }

  // Compute subsequent rows
  for (let i = 1; i <= str1.length; ++i) {
    const ithChar = str1.charAt(i - 1);
    row2[0] = row1[0] + indel(ithChar);
    for (let j = 1; j <= str2.length; ++j) {
      const jthChar = str2.charAt(j - 1);
      const subCost = row1[j - 1] + sub(ithChar, jthChar);
      const delCost = row2[j - 1] + indel(jthChar);
      const insCost = row1[j] + indel(ithChar);

      row2[j] = Math.min(subCost, delCost, insCost);
    }

    row1 = row2;
    row2 = new Array(row1.length);
  }

  return row1;
}

/**
 * Return the hirschberg matching score
 * Assumes str2 has the lesser length for better efficiency
 * @param {String} str1
 * @param {String} str2
 * @return {Number} score
 */
function hirschberg(str1, str2) {
  if (str1.length === 1 || str2.length === 1) {
    // Compute nw with str2 being the min length str
    let row;
    if (str1.length < str2.length) {
      row = nw(str2, str1);
    } else {
      row = nw(str1, str2);
    }

    return row[row.length - 1];
  } else {
    // Partition str1
    const mid1 = str1.length / 2;
    const p1 = str1.substr(0, mid1);
    const p2 = str1.substr(mid1);

    const scoreD = nw(p1, str2);
    const scoreU = nw(reverse(p2), reverse(str2)).reverse();

    // Divide
    let minScore = Infinity;
    let mid2 = -1;
    for (let i = 0; i < scoreD.length; ++i) {
      const sum = scoreD[i] + scoreU[i];
      if (sum < minScore) {
        minScore = sum;
        mid2 = i;
      }
    }

    // Conquer
    return hirschberg(p1, str2.substr(0, mid2)) +
      hirschberg(p2, str2.substr(mid2));
  }
}

// Return all keywords
app.get("/api/keywords", (req, res) => {
  db.collection("Items").get().then((snap) => {
    const docs = snap.docs;
    const results = [];
    for (const doc of docs) {
      const ddata = doc.data();
      results.push({
        id: doc.id,
        kw: ddata.kw,
        data: ddata.data,
      });
    }
    res.status(200).send(results);
  }).catch((error) => {
    res.status(500).send(error);
  });
});

// Return the best matching keywords (top 3)
app.get("/api/match/:kw", (req, res) => {
  // Define variables
  const target = req.params.kw.toUpperCase();
  const minScores = new Array(3);
  const results = new Array(3);

  // Initialize top score arrays
  for (let i = 0; i < 3; ++i) {
    minScores[i] = Infinity;
  }

  db.collection("Items").get().then((snap) => {
    const docs = snap.docs;

    // Loop thru Items in database
    for (const doc of docs) {
      let localMinScore = Infinity;

      // Loop thru aliases
      for (const w of doc.data().kw) {
        // Apply fuzzy search
        if (w.length < target.length) {
          const score = hirschberg(target, w);
          if (score < localMinScore) {
            localMinScore = score;
          }
        } else {
          const score = hirschberg(w, target);
          if (score < localMinScore) {
            localMinScore = score;
          }
        }
      }

      // Store into results if in top three
      for (let j = 0; j < 3; ++j) {
        if (localMinScore < minScores[j]) {
          // Shift and make room
          if (j + 1 < 3) {
            minScores[j + 1] = minScores[j];
            results[j + 1] = results[j];
          }

          minScores[j] = localMinScore;
          results[j] = {
            id: doc.id,
            kw: doc.data().kw,
            data: doc.data().data,
            score: localMinScore,
          };
          break;
        }
      }
    }

    // Return results array
    res.status(200).send(results);
  }).catch((error) => {
    res.status(500).send(error);
  });
});

// Return an exact match
app.get("/api/match-exact/:kw", (req, res) => {
  db.collection("Items").
      where("kw", "array-contains", req.params.kw.toUpperCase()).
      get().then((snap) => {
        const docs = snap.docs;
        const results = [];
        for (const doc of docs) {
          const ddata = doc.data();
          results.push({
            id: doc.id,
            kw: ddata.kw,
            data: ddata.data,
          });
        }
        if (results.length === 0) {
          res.status(200).send("Match not found");
        } else {
          res.status(200).send(results);
        }
      }).catch((error) => {
        res.status(500).send(error);
      });
});

// Add a new keyword
app.post("/api/add", (req, res) => {
  // Validate req body
  const schema = Joi.object({
    kw: Joi.array().items(Joi.string().trim().min(2).regex(/^[a-zA-Z0-9-_]*$/)
        .required()) .required(),
    data: Joi.string().required(),
  });

  const {error} = schema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  } else {
    for (let i = 0; i < req.body.kw.length; ++i) {
      req.body.kw[i] = req.body.kw[i].toUpperCase();
    }
  }

  db.collection("Items").add({kw: req.body.kw, data: req.body.data})
      .then(() => {
        res.status(200).send("Successful add.");
      }).catch((error) => {
        res.status(400).send(error);
      });
});

// Add a batch of items
app.post("/api/add-batch", (req, res) => {
  const schema = Joi.array().items(
      Joi.object({
        kw: Joi.array().items(Joi.string().trim().min(2)
            .regex(/^[a-zA-Z0-9-_]*$/).required()).required(),
        data: Joi.string().required(),
      })
  );

  const {error} = schema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  } else {
    for (const item of req.body) {
      for (let i = 0; i < item.kw.length; ++i) {
        item.kw[i] = item.kw[i].toUpperCase();
      }
    }
  }

  for (let i = 0; i < req.body.length; ++i) {
    db.collection("Items").add(req.body[i]).then(() => { }).catch((error) => {
      res.status(400).send(error);
    });
  }

  return res.status(200).send("Successful add.");
});

// Update an entry
app.put("/api/update/:id", (req, res) => {
  // Validate alias
  const schema = Joi.object({
    addKw: Joi.array().items(Joi.string().trim().min(2)
        .regex(/^[a-zA-Z0-9-_]*$/).required()),
    removeKw: Joi.array().items(Joi.string().trim().min(2)
        .regex(/^[a-zA-Z0-9-_]*$/).required()),
    ovData: Joi.string(),
  });

  const {error} = schema.validate(req.body);
  if (error) {
    return res.status(400).send(error.details[0].message);
  }

  const batch = db.batch();
  const ref = db.collection("Items").doc(req.params.id);

  // Add updates the batch
  if (req.body.addKw != undefined) {
    for (const kw of req.body.addKw) {
      batch.update(ref, {
        kw: admin.firestore.FieldValue
            .arrayUnion(kw.toUpperCase()),
      });
    }
  }

  if (req.body.removeKw != undefined) {
    for (const kw of req.body.removeKw) {
      batch.update(ref, {
        kw: admin.firestore.FieldValue
            .arrayRemove(kw.toUpperCase()),
      });
    }
  }

  if (req.body.ovData != undefined) {
    batch.update(ref, {
      data: req.body.ovData,
    });
  }

  batch.commit().then(() => {
    res.status(200).send("Succesful update");
  }).catch((error) => {
    res.status(500).send(error);
  });
});

// Delete a keyword
app.delete("/api/delete/:id", (req, res) => {
  db.collection("Items").doc(req.params.id).delete().then(() => {
    res.status(200).send("Successful deletion");
  }).catch((error) => {
    res.status(400).send(error);
  });
});

// Export
exports.app = functions.https.onRequest(app);
