<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
    file: { type: Object, required: true },
    kind: { type: String, default: "avatar" },
    aspectRatio: { type: Number, default: 3.2 },
});

const emit = defineEmits(["cancel", "confirm"]);
const viewport = ref(null);
const image = ref(null);
const imageUrl = ref("");
const loadError = ref("");
const processing = ref(false);
const zoom = ref(1);
const baseScale = ref(1);
const viewportWidth = ref(0);
const viewportHeight = ref(0);
const imageX = ref(0);
const imageY = ref(0);
const isAvatar = computed(() => props.kind === "avatar");
const frameRatio = computed(() => isAvatar.value ? 1 : clamp(Number(props.aspectRatio) || 3.2, 1.5, 8));
const title = computed(() => isAvatar.value ? "Ajustar foto de perfil" : "Ajustar imagem de capa");
const hint = computed(() => isAvatar.value
    ? "Arraste a imagem e ajuste o zoom para escolher o enquadramento da foto."
    : "Arraste a imagem e ajuste o zoom para enquadrar a capa.");
const imageStyle = computed(() => ({
    width: `${(image.value?.naturalWidth || 0) * baseScale.value * zoom.value}px`,
    height: `${(image.value?.naturalHeight || 0) * baseScale.value * zoom.value}px`,
    left: `${imageX.value}px`,
    top: `${imageY.value}px`,
}));

let resizeObserver = null;
let dragState = null;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function clampPosition() {
    if (!image.value || !viewportWidth.value || !viewportHeight.value) return;
    const width = image.value.naturalWidth * baseScale.value * zoom.value;
    const height = image.value.naturalHeight * baseScale.value * zoom.value;
    imageX.value = clamp(imageX.value, viewportWidth.value - width, 0);
    imageY.value = clamp(imageY.value, viewportHeight.value - height, 0);
}

function centerImage() {
    if (!image.value || !viewportWidth.value || !viewportHeight.value) return;
    const scale = Math.max(
        viewportWidth.value / image.value.naturalWidth,
        viewportHeight.value / image.value.naturalHeight,
    );
    baseScale.value = scale;
    zoom.value = 1;
    const width = image.value.naturalWidth * scale;
    const height = image.value.naturalHeight * scale;
    imageX.value = (viewportWidth.value - width) / 2;
    imageY.value = (viewportHeight.value - height) / 2;
    clampPosition();
}

function measureViewport() {
    if (!viewport.value) return;
    const rect = viewport.value.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    viewportWidth.value = rect.width;
    viewportHeight.value = rect.height;
    centerImage();
}

async function loadFile(file) {
    loadError.value = "";
    image.value = null;
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
    imageUrl.value = "";

    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        loadError.value = "Escolha uma imagem JPG, PNG ou WebP.";
        return;
    }
    if (file.size > 12 * 1024 * 1024) {
        loadError.value = "A imagem original deve ter no máximo 12 MB.";
        return;
    }

    const url = URL.createObjectURL(file);
    imageUrl.value = url;
    const loadedImage = new Image();
    loadedImage.onload = async () => {
        image.value = loadedImage;
        await nextTick();
        measureViewport();
    };
    loadedImage.onerror = () => {
        loadError.value = "Não foi possível abrir esta imagem. Escolha outro arquivo.";
        image.value = null;
    };
    loadedImage.src = url;
}

function setZoom(nextZoom) {
    if (!image.value) return;
    const previousScale = baseScale.value * zoom.value;
    const next = clamp(Number(nextZoom) || 1, 1, 3.5);
    const nextScale = baseScale.value * next;
    const centerSourceX = (viewportWidth.value / 2 - imageX.value) / previousScale;
    const centerSourceY = (viewportHeight.value / 2 - imageY.value) / previousScale;
    zoom.value = next;
    imageX.value = viewportWidth.value / 2 - centerSourceX * nextScale;
    imageY.value = viewportHeight.value / 2 - centerSourceY * nextScale;
    clampPosition();
}

function startDrag(event) {
    if (!image.value || event.button !== 0) return;
    event.preventDefault();
    dragState = { pointerX: event.clientX, pointerY: event.clientY, imageX: imageX.value, imageY: imageY.value };
    viewport.value?.setPointerCapture?.(event.pointerId);
}

function moveDrag(event) {
    if (!dragState) return;
    imageX.value = dragState.imageX + event.clientX - dragState.pointerX;
    imageY.value = dragState.imageY + event.clientY - dragState.pointerY;
    clampPosition();
}

function stopDrag() {
    dragState = null;
}

async function confirmCrop() {
    if (!image.value || !viewportWidth.value || processing.value) return;
    processing.value = true;
    try {
        let outputWidth = isAvatar.value ? 720 : 1800;
        let outputHeight = isAvatar.value ? 720 : Math.round(outputWidth / frameRatio.value);
        if (!isAvatar.value && outputHeight > 800) {
            outputHeight = 800;
            outputWidth = Math.round(outputHeight * frameRatio.value);
        }
        const scale = baseScale.value * zoom.value;
        const sourceX = clamp(-imageX.value / scale, 0, image.value.naturalWidth);
        const sourceY = clamp(-imageY.value / scale, 0, image.value.naturalHeight);
        const sourceWidth = Math.min(viewportWidth.value / scale, image.value.naturalWidth - sourceX);
        const sourceHeight = Math.min(viewportHeight.value / scale, image.value.naturalHeight - sourceY);
        const canvas = document.createElement("canvas");
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Não foi possível preparar o recorte da imagem.");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image.value, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
        if (!blob) throw new Error("Não foi possível gerar a imagem recortada.");
        const baseName = String(props.file?.name || "imagem").replace(/\.[^.]+$/, "") || "imagem";
        const croppedFile = new File([blob], `${baseName}-${props.kind}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
        });
        emit("confirm", croppedFile);
    } catch (error) {
        loadError.value = error.message || "Não foi possível recortar a imagem.";
    } finally {
        processing.value = false;
    }
}

function onKeydown(event) {
    if (event.key === "Escape" && !processing.value) emit("cancel");
}

watch(() => props.file, loadFile, { immediate: true });
onMounted(async () => {
    await nextTick();
    measureViewport();
    if (typeof ResizeObserver !== "undefined" && viewport.value) {
        resizeObserver = new ResizeObserver(measureViewport);
        resizeObserver.observe(viewport.value);
    }
    window.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    window.removeEventListener("keydown", onKeydown);
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
});
</script>

<template>
    <Teleport to="body">
        <div class="image-cropper-overlay" role="presentation" @click.self="!processing && emit('cancel')">
            <section class="image-cropper-dialog" role="dialog" aria-modal="true" aria-labelledby="imageCropperTitle">
                <header class="image-cropper-header">
                    <div>
                        <h2 id="imageCropperTitle">{{ title }}</h2>
                        <p>{{ hint }}</p>
                    </div>
                    <button type="button" class="image-cropper-close" aria-label="Fechar editor" :disabled="processing" @click="emit('cancel')">×</button>
                </header>

                <div class="image-cropper-stage">
                    <div
                        ref="viewport"
                        class="image-cropper-viewport"
                        :class="isAvatar ? 'is-avatar' : 'is-cover'"
                        :style="{ aspectRatio: String(frameRatio) }"
                        @pointerdown="startDrag"
                        @pointermove="moveDrag"
                        @pointerup="stopDrag"
                        @pointercancel="stopDrag"
                        @lostpointercapture="stopDrag"
                    >
                        <img v-if="image" :src="imageUrl" alt="Pré-visualização da imagem" class="image-cropper-source" :style="imageStyle" draggable="false">
                        <div v-if="image" class="image-cropper-guide" :class="isAvatar ? 'avatar-guide' : 'cover-guide'"></div>
                        <div v-if="!image && !loadError" class="image-cropper-loading">Carregando imagem...</div>
                        <div v-if="loadError" class="image-cropper-error" role="alert">{{ loadError }}</div>
                    </div>
                </div>

                <div class="image-cropper-controls">
                    <span class="cropper-control-label">−</span>
                    <input
                        class="image-cropper-zoom"
                        type="range"
                        min="1"
                        max="3.5"
                        step="0.01"
                        :value="zoom"
                        :disabled="!image || processing"
                        aria-label="Ajustar zoom da imagem"
                        @input="setZoom($event.target.value)"
                    >
                    <span class="cropper-control-label">+</span>
                    <span class="image-cropper-zoom-value">{{ Math.round(zoom * 100) }}%</span>
                </div>
                <p class="image-cropper-tip">Arraste a imagem para reposicionar · Use o controle para aproximar ou afastar</p>

                <footer class="image-cropper-actions">
                    <button type="button" class="image-cropper-cancel" :disabled="processing" @click="emit('cancel')">Cancelar</button>
                    <button type="button" class="image-cropper-confirm" :disabled="!image || processing" @click="confirmCrop">
                        {{ processing ? "Preparando..." : "Aplicar recorte" }}
                    </button>
                </footer>
            </section>
        </div>
    </Teleport>
</template>

<style scoped>
.image-cropper-overlay {
    position: fixed;
    inset: 0;
    z-index: 10050;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(3, 6, 14, .82);
    backdrop-filter: blur(7px);
}
.image-cropper-dialog {
    width: min(100%, 680px);
    max-height: min(92vh, 900px);
    overflow: auto;
    padding: 24px;
    color: #f8fafc;
    background: #111827;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 18px;
    box-shadow: 0 28px 90px rgba(0,0,0,.58);
}
.image-cropper-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    margin-bottom: 20px;
}
.image-cropper-header h2 {
    margin: 0;
    color: #f8fafc;
    font-size: 22px;
    font-weight: 800;
}
.image-cropper-header p {
    margin: 7px 0 0;
    color: #94a3b8;
    font-size: 13px;
    line-height: 1.5;
}
.image-cropper-close {
    flex: 0 0 auto;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: #cbd5e1;
    font-size: 30px;
    line-height: 1;
    cursor: pointer;
}
.image-cropper-close:hover { background: rgba(255,255,255,.08); }
.image-cropper-stage {
    display: grid;
    place-items: center;
    padding: 18px;
    min-height: 180px;
    background: #080d18;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 13px;
}
.image-cropper-viewport {
    position: relative;
    width: min(100%, 500px);
    overflow: hidden;
    background: #171b25;
    cursor: grab;
    touch-action: none;
    user-select: none;
}
.image-cropper-viewport:active { cursor: grabbing; }
.image-cropper-viewport.is-avatar { max-width: 420px; }
.image-cropper-viewport.is-cover { max-width: 560px; }
.image-cropper-source {
    position: absolute;
    display: block;
    max-width: none;
    max-height: none;
    pointer-events: none;
    user-select: none;
}
.image-cropper-guide {
    position: absolute;
    inset: 0;
    pointer-events: none;
}
.avatar-guide {
    inset: 1px;
    border: 4px solid rgba(255,255,255,.96);
    border-radius: 50%;
    box-shadow: 0 0 0 9999px rgba(0,0,0,.38), inset 0 0 0 1px rgba(0,0,0,.12);
}
.cover-guide {
    border: 3px solid rgba(255,255,255,.96);
    border-radius: 8px;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,.2);
}
.image-cropper-loading,
.image-cropper-error {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    color: #cbd5e1;
    text-align: center;
    font-size: 14px;
}
.image-cropper-error { color: #fca5a5; }
.image-cropper-controls {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 22px 4px 0;
}
.cropper-control-label {
    color: #cbd5e1;
    font-size: 22px;
    font-weight: 700;
}
.image-cropper-zoom {
    flex: 1;
    min-width: 70px;
    accent-color: #c2414b;
    cursor: pointer;
}
.image-cropper-zoom-value {
    min-width: 48px;
    color: #94a3b8;
    text-align: right;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
}
.image-cropper-tip {
    margin: 10px 4px 0;
    color: #7f8da3;
    font-size: 12px;
    text-align: center;
}
.image-cropper-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 22px;
}
.image-cropper-actions button {
    min-height: 42px;
    padding: 0 18px;
    border-radius: 10px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
}
.image-cropper-cancel {
    color: #cbd5e1;
    background: #1e293b;
    border: 1px solid rgba(255,255,255,.1);
}
.image-cropper-confirm {
    color: white;
    background: linear-gradient(135deg, #a51d2a, #680b0d);
    border: 1px solid rgba(255,255,255,.08);
}
.image-cropper-actions button:disabled,
.image-cropper-close:disabled { opacity: .55; cursor: not-allowed; }
@media (max-width: 560px) {
    .image-cropper-overlay { padding: 10px; }
    .image-cropper-dialog { padding: 16px; border-radius: 14px; }
    .image-cropper-header h2 { font-size: 19px; }
    .image-cropper-stage { padding: 10px; }
    .image-cropper-actions { flex-direction: column-reverse; }
    .image-cropper-actions button { width: 100%; }
}
</style>
