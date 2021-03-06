/** Shim for the keyboard API because it won't hit in FF57. */

import * as Messaging from "./messaging"
import * as msgsafe from "./msgsafe"
import { isTextEditable, getAllDocumentFrames } from "./dom"
import { isSimpleKey } from "./keyseq"

function keyeventHandler(ke: KeyboardEvent) {
    // Ignore JS-generated events for security reasons.
    if (!ke.isTrusted) return

    // Mode is changed based on ke target in the bg.
    if (state.mode === "input" || !isTextEditable(ke.target as Node)) {
        modeSpecificSuppression(ke)
    }

    Messaging.message("keydown_background", "recvEvent", [
        msgsafe.KeyboardEvent(ke),
    ])
}

// {{{ Bad key suppression system

// This is all awful and will go away when we move the parsers and stuff to content properly.

import state from "./state"

import * as normalmode from "./parsers/normalmode"
let keys = []

/** Choose to suppress a key or not */
function modeSpecificSuppression(ke: KeyboardEvent) {
    switch (state.mode) {
        case "normal":
            keys.push(ke)
            const response = normalmode.parser(keys)

            // Suppress if there's a match.
            if (response.isMatch) {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }

            // Update keys array.
            keys = response.keys || []
            break
        // Hintmode can't clean up after itself yet, so it needs to block more FF shortcuts.
        case "hint":
        case "find":
            if (isSimpleKey(ke)) {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }
            break
        case "gobble":
            if (isSimpleKey(ke) || ke.key === "Escape") {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }
            break
        case "input":
            if (ke.key === "Tab") {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }
            break
        case "ignore":
            break
        case "insert":
            break
    }
}

// }}}

// Add listeners
window.addEventListener("keydown", keyeventHandler, true)
document.addEventListener("readystatechange", ev =>
    getAllDocumentFrames().map(frame => {
        frame.contentWindow.removeEventListener(
            "keydown",
            keyeventHandler,
            true,
        )
        frame.contentWindow.addEventListener("keydown", keyeventHandler, true)
    }),
)
import * as SELF from "./keydown_content"
Messaging.addListener("keydown_content", Messaging.attributeCaller(SELF))

// Dummy export so that TS treats this as a module.
export {}
