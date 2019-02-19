import {collab, receiveTransaction} from "prosemirror-collab"
import {history, undo} from "prosemirror-history"
import {EditorState, TextSelection} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {Schema, DOMParser} from "prosemirror-model"
import {schema} from "prosemirror-schema-basic"
import {addListNodes} from "prosemirror-schema-list"
import {exampleSetup} from "prosemirror-example-setup"
import {Step} from "prosemirror-transform"


// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
  marks: schema.spec.marks
})

window.view = new EditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(mySchema).parse(document.querySelector("#content")),
    plugins: exampleSetup({schema: mySchema}).concat([
      collab({clientID: 4})
    ])
  })
})


function receiveSteps (stepData, remote=true) {
  const tr = receiveTransaction(
    window.view.state,
    stepData.map(j => Step.fromJSON(mySchema, j)),
    stepData.map(() => remote ? 5 : 4)
  )
  window.view.dispatch(tr)
}

function applySteps(stepData) {
  const steps = stepData.map(j => Step.fromJSON(mySchema, j))
  const tr = window.view.state.tr
  steps.forEach(step => tr.step(step))
  window.view.dispatch(tr)
}

function setSelection(from, to) {
  const tr = window.view.state.tr
  tr.setSelection(TextSelection.create(window.view.state.doc, from, to))
  window.view.dispatch(tr)
}

// Test

// Remote user:
receiveSteps([{stepType: 'replace', from: 10, to: 10, slice: {content: [{type: 'text', text: 'A'}]}}])
receiveSteps([{stepType: 'replace', from: 11, to: 11, slice: {content: [{type: 'text', text: 'B'}]}}])
receiveSteps([{stepType: 'replace', from: 12, to: 12, slice: {content: [{type: 'text', text: 'C'}]}}])
// Local user tr 1:
setSelection(6, 13)
// Remote user:
receiveSteps([{stepType: 'replace', from: 13, to: 13, slice: {content: [{type: 'text', text: 'D'}]}}])
// Local user tr 2:
applySteps([{stepType: 'replace', from: 6, to: 13}])
// Remote user (before tr 2 has been confirmed by central authority):
receiveSteps([{stepType: 'replace', from: 13, to: 13, slice: {content: [{type: 'text', text: 'E'}]}}])
// Local user, rebased version of tr 2 is confirmed by central authority:
receiveSteps([{stepType: 'replace', from: 6, to: 13}], false)
// Local user uses undo
undo(window.view.state, tr => window.view.dispatch(tr))
// Error!
