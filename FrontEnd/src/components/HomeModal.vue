<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

const isOpen = ref(false);
const title = ref("Overclock Society");
const message = ref("Em breve você poderá criar seu perfil gamer.");
const buttonLabel = ref("Entendi");
const overlayElement = ref(null);
const previousFocus = ref(null);
let previousBodyOverflow = "";

async function open(options = {}) {
    const config = typeof options === "string" ? { title: options } : (options || {});

    title.value = String(config.title || "Overclock Society");
    message.value = String(config.message || "Em breve você poderá criar seu perfil gamer.");
    buttonLabel.value = String(config.buttonLabel || "Entendi");

    if (!isOpen.value) {
        previousFocus.value = document.activeElement;
        previousBodyOverflow = document.body.style.overflow;
    }

    isOpen.value = true;
    document.body.style.overflow = "hidden";
    await nextTick();
    overlayElement.value?.querySelector(".modal-close")?.focus();
}

async function close() {
    if (!isOpen.value) return;

    isOpen.value = false;
    document.body.style.overflow = previousBodyOverflow;

    const focusTarget = previousFocus.value;
    previousFocus.value = null;
    await nextTick();

    if (focusTarget?.isConnected && typeof focusTarget.focus === "function") {
        focusTarget.focus({ preventScroll: true });
    }
}

function handleKeydown(event) {
    if (!isOpen.value) return;

    if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
    }

    if (event.key !== "Tab") return;

    const controls = Array.from(overlayElement.value?.querySelectorAll(
        ".modal button:not([disabled]), .modal a[href], .modal input:not([disabled]), .modal select:not([disabled]), .modal textarea:not([disabled]), .modal [tabindex]:not([tabindex='-1'])"
    ) || []);

    if (controls.length === 0) return;

    const first = controls[0];
    const last = controls[controls.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

onMounted(() => {
    document.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
    document.removeEventListener("keydown", handleKeydown);
    if (isOpen.value) {
        document.body.style.overflow = previousBodyOverflow;
    }
});

defineExpose({
    open,
    close,
    isOpen: () => isOpen.value
});
</script>

<template>
    <Teleport to="body">
        <div
            ref="overlayElement"
            class="modal-overlay"
            id="modalOverlay"
            :class="{ active: isOpen }"
            :aria-hidden="String(!isOpen)"
            :inert="!isOpen"
            @click.self="close"
        >
            <div
                class="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modalTitle"
                aria-describedby="modalMessage"
            >
                <button class="modal-close" id="modalClose" type="button" aria-label="Fechar" @click="close">
                    ×
                </button>

                <div class="modal-icon" aria-hidden="true">🎮</div>
                <h2 id="modalTitle">{{ title }}</h2>
                <p id="modalMessage">{{ message }}</p>

                <button class="btn btn-primary modal-button" id="modalButton" type="button" @click="close">
                    {{ buttonLabel }}
                </button>
            </div>
        </div>
    </Teleport>
</template>
