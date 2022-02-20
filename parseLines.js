const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const createdByLineStart = 'Created by'
const overwrittenLineStart = 'This document is overwritten'
const copyLineStart = 'You should make a copy'
const notesHighlightsStats = 'notes/highlights'
let title
let author

export default function parseLines(writer, line, i) {
  switch (true) {
    case line.trim().length === 0:
      // Skip empty lines
      return
    case i === 0:
      // First line is always the text "Cover Image"
      return
    case i == 2:
      // Title
      title = line.trim()
      line = `---\nTitle: ${title}`
      break
    case i == 3:
      // Author
      author = line.trim()
      line = `Author: ${author}`
      break
    case line.includes(overwrittenLineStart) ||
      line.includes(copyLineStart) ||
      line.includes(notesHighlightsStats):
      return
    case line.includes(createdByLineStart):
      // "Created by ... ... - Last synced ..."
      let [createdBy, date] = line.trim().split('–')
      createdBy = createdBy.replace('Created by', '').trim()
      date = date.replace('Last synced', '').trim()
      line = `Created by: ${createdBy}\nDate: ${date}\n---\n\n# ${title} - ${author}\n`
      break
    case months.includes(line.trim().split(' ')[0]):
      // Time stamps for highlights
      return
    case line[0] === '\t':
      if (!isNaN(Number(line))) {
        // Page number
        return
      } else {
        // Highlights
        line = `> ${line.trim()}\n`
      }
      break
    case i < 15:
      return
    case i > 15:
      // What's left are the chapter subheadings
      line = `## ${line}`
  }

  writer.write(line + '\n')
}
