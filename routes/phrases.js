const express = require("express")
const router = express.Router()
const { createClient } = require("@supabase/supabase-js")

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Get all phrases with pagination and filtering
router.get("/", async (req, res) => {
  try {
    const { limit = 100, offset = 0, wordlist } = req.query

    let query = supabase
      .from("phrases")
      .select("*")
      .order("created_at", { ascending: false })
      .range(Number.parseInt(offset), Number.parseInt(offset) + Number.parseInt(limit) - 1)

    // Apply wordlist filter if provided
    if (wordlist) {
      query = query.eq("wordlist", wordlist)
    }

    const { data, error } = await query

    if (error) throw error

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from("phrases")
      .select("*", { count: "exact" })
      .eq(wordlist ? "wordlist" : "id", wordlist || 1) // Dummy condition if no wordlist filter

    if (countError) throw countError

    res.json({
      phrases: data,
      total: count,
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
    })
  } catch (error) {
    console.error("Error fetching phrases:", error)
    res.status(500).json({ error: error.message })
  }
})

// Upload phrases
router.post("/upload", async (req, res) => {
  try {
    const { phrases, wordlist } = req.body

    if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
      return res.status(400).json({ error: "Invalid phrases data" })
    }

    if (!wordlist) {
      return res.status(400).json({ error: "Wordlist name is required" })
    }

    // Prepare data for batch insert
    const timestamp = new Date().toISOString()
    const phrasesData = phrases.map((phrase) => ({
      phrase,
      wordlist,
      created_at: timestamp,
      updated_at: timestamp,
      scanned: false,
      scan_count: 0,
    }))

    // Insert in batches of 1000 to avoid request size limits
    const batchSize = 1000
    let insertedCount = 0

    for (let i = 0; i < phrasesData.length; i += batchSize) {
      const batch = phrasesData.slice(i, i + batchSize)
      const { error } = await supabase.from("phrases").insert(batch)

      if (error) throw error

      insertedCount += batch.length
    }

    res.json({
      success: true,
      count: insertedCount,
      message: `Successfully uploaded ${insertedCount} phrases to wordlist "${wordlist}"`,
    })
  } catch (error) {
    console.error("Error uploading phrases:", error)
    res.status(500).json({ error: error.message })
  }
})

// Mark phrases as scanned
router.post("/mark-scanned", async (req, res) => {
  try {
    const { phraseIds } = req.body

    if (!phraseIds || !Array.isArray(phraseIds) || phraseIds.length === 0) {
      return res.status(400).json({ error: "Invalid phrase IDs" })
    }

    const { error } = await supabase
      .from("phrases")
      .update({
        scanned: true,
        scan_count: supabase.rpc("increment", { x: 1 }),
        last_scanned_at: new Date().toISOString(),
      })
      .in("id", phraseIds)

    if (error) throw error

    res.json({
      success: true,
      count: phraseIds.length,
      message: `Successfully marked ${phraseIds.length} phrases as scanned`,
    })
  } catch (error) {
    console.error("Error marking phrases as scanned:", error)
    res.status(500).json({ error: error.message })
  }
})

// Get wordlist statistics
router.get("/stats", async (req, res) => {
  try {
    // Get total phrases count
    const { count: totalCount, error: countError } = await supabase.from("phrases").select("*", { count: "exact" })

    if (countError) throw countError

    // Get scanned phrases count
    const { count: scannedCount, error: scannedError } = await supabase
      .from("phrases")
      .select("*", { count: "exact" })
      .eq("scanned", true)

    if (scannedError) throw scannedError

    // Get wordlist distribution
    const { data: wordlistData, error: wordlistError } = await supabase
      .from("phrases")
      .select("wordlist, count")
      .group("wordlist")

    if (wordlistError) throw wordlistError

    res.json({
      total: totalCount,
      scanned: scannedCount,
      wordlists: wordlistData,
      scanPercentage: totalCount > 0 ? (scannedCount / totalCount) * 100 : 0,
    })
  } catch (error) {
    console.error("Error fetching phrase statistics:", error)
    res.status(500).json({ error: error.message })
  }
})

// Get phrases for scanning (returns unscanned phrases)
router.get("/for-scanning", async (req, res) => {
  try {
    const { limit = 1000, wordlist } = req.query

    let query = supabase
      .from("phrases")
      .select("id, phrase, wordlist")
      .eq("scanned", false)
      .order("created_at", { ascending: true })
      .limit(Number.parseInt(limit))

    // Apply wordlist filter if provided
    if (wordlist) {
      query = query.eq("wordlist", wordlist)
    }

    const { data, error } = await query

    if (error) throw error

    res.json({
      phrases: data,
      count: data.length,
    })
  } catch (error) {
    console.error("Error fetching phrases for scanning:", error)
    res.status(500).json({ error: error.message })
  }
})

// Delete phrases by wordlist
router.delete("/wordlist/:wordlist", async (req, res) => {
  try {
    const { wordlist } = req.params

    if (!wordlist) {
      return res.status(400).json({ error: "Wordlist name is required" })
    }

    // Get count before deletion
    const { count, error: countError } = await supabase
      .from("phrases")
      .select("*", { count: "exact" })
      .eq("wordlist", wordlist)

    if (countError) throw countError

    // Delete phrases
    const { error } = await supabase.from("phrases").delete().eq("wordlist", wordlist)

    if (error) throw error

    res.json({
      success: true,
      count,
      message: `Successfully deleted ${count} phrases from wordlist "${wordlist}"`,
    })
  } catch (error) {
    console.error("Error deleting phrases:", error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
