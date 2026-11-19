<script setup>
import { computed, nextTick, ref, watch } from "vue";
import ImageCropper from "./ImageCropper.vue";

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    form: { type: Object, required: true },
    saving: { type: Boolean, default: false },
    avatarPreviewUrl: { type: String, default: "" },
    coverPreviewUrl: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "save", "avatar-selected", "cover-selected"]);
const avatarInput = ref(null);
const coverInput = ref(null);
const cropperFile = ref(null);
const cropperKind = ref("avatar");
const cropperAspectRatio = ref(1);
const close = () => emit("update:modelValue", false);

function openFilePicker(kind) {
    nextTick(() => (kind === "avatar" ? avatarInput.value : coverInput.value)?.click());
}

defineExpose({ openFilePicker });

const courseGroups = [
    { label: "Tecnologia e Computação", values: ["Análise e Desenvolvimento de Sistemas", "Banco de Dados", "Ciência da Computação", "Ciência de Dados", "Desenvolvimento de Software Multiplataforma", "Engenharia de Computação", "Engenharia de Software", "Gestão da Tecnologia da Informação", "Inteligência Artificial", "Jogos Digitais", "Redes de Computadores", "Segurança da Informação", "Sistemas de Informação", "Sistemas para Internet"] },
    { label: "Engenharias e Arquitetura", values: ["Arquitetura e Urbanismo", "Engenharia Ambiental e Sanitária", "Engenharia Civil", "Engenharia de Produção", "Engenharia Elétrica", "Engenharia Mecânica", "Engenharia Química", "Engenharia de Controle e Automação"] },
    { label: "Ciências da Saúde", values: ["Biomedicina", "Educação Física", "Enfermagem", "Farmácia", "Fisioterapia", "Medicina", "Medicina Veterinária", "Fonoaudiologia", "Terapia Ocupacional", "Nutrição", "Odontologia", "Psicologia"] },
    { label: "Ciências Humanas e Sociais", values: ["Administração", "Ciências Contábeis", "Ciências Econômicas", "Direito", "Jornalismo", "Design", "Design Gráfico", "Ciências Sociais", "Geografia", "História", "Letras", "Pedagogia", "Publicidade e Propaganda", "Relações Internacionais", "Serviço Social"] },
    { label: "Ciências Exatas e Agrárias", values: ["Agronomia", "Estatística", "Ciências Biológicas", "Física", "Matemática", "Química"] },
];
const allCourses = computed(() => courseGroups.flatMap((group) => group.values).concat("Outro curso"));
const hasLegacyCourse = computed(() => Boolean(props.form.course) && !allCourses.value.includes(props.form.course));
const semesters = Array.from({ length: 10 }, (_, index) => index + 1);
const platforms = [
    { value: "PC", label: "🖥️ PC" },
    { value: "PlayStation 5", label: "🎮 PlayStation 5" },
    { value: "Xbox Series", label: "🎮 Xbox Series" },
    { value: "Nintendo Switch", label: "🕹️ Nintendo Switch" },
];
const genres = ["RPG", "Ação", "Aventura", "Soulslike", "Sandbox", "FPS", "Terror", "Estratégia"];

let previousBodyOverflow = "";
watch(() => props.modelValue, (open) => {
    if (open) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        nextTick(() => document.querySelector(".profile-modal .modal-close")?.focus());
    } else {
        document.body.style.overflow = previousBodyOverflow;
        if (avatarInput.value) avatarInput.value.value = "";
        if (coverInput.value) coverInput.value.value = "";
    }
});

function emitFile(kind, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    cropperKind.value = kind;
    if (kind === "cover") {
        const cover = document.querySelector(".profile-cover");
        const bounds = cover?.getBoundingClientRect();
        cropperAspectRatio.value = bounds?.width > 0 && bounds?.height > 0
            ? bounds.width / bounds.height
            : 3.2;
    } else {
        cropperAspectRatio.value = 1;
    }
    cropperFile.value = file;
}

function cancelCrop() {
    cropperFile.value = null;
}

function confirmCrop(file) {
    const kind = cropperKind.value;
    cropperFile.value = null;
    emit(kind === "avatar" ? "avatar-selected" : "cover-selected", file);
}
</script>

<template>
    <Teleport to="body">
        <div v-if="modelValue" class="profile-modal-overlay active" role="presentation" @click.self="close">
            <section class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profileEditorTitle">
                <button class="modal-close" type="button" aria-label="Fechar edição de perfil" @click="close">×</button>

                <div class="modal-heading">
                    <div class="modal-heading-icon">✏️</div>
                    <div>
                        <span class="section-label">PERSONALIZAÇÃO</span>
                        <h2 id="profileEditorTitle">Editar perfil</h2>
                    </div>
                </div>

                <form @submit.prevent="emit('save')">
                    <div class="edit-section">
                        <div class="edit-section-title">Identidade</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="profileName">Nome</label>
                                <input id="profileName" v-model="form.name" type="text" minlength="2" maxlength="120" required>
                            </div>
                            <div class="form-group">
                                <label for="profileUsername">Nome de usuário</label>
                                <input id="profileUsername" v-model="form.username" type="text" minlength="3" maxlength="32" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="profileCourse">Curso</label>
                                <select id="profileCourse" v-model="form.course" name="course">
                                    <option value="">Selecione seu curso</option>
                                    <optgroup v-for="group in courseGroups" :key="group.label" :label="group.label">
                                        <option v-for="course in group.values" :key="course" :value="course">{{ course }}</option>
                                    </optgroup>
                                    <option value="Outro curso">Outro curso (não listado)</option>
                                    <option v-if="hasLegacyCourse" :value="form.course">{{ form.course }} (curso cadastrado)</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="profileSemester">Período</label>
                                <select id="profileSemester" v-model.number="form.semester">
                                    <option v-for="semester in semesters" :key="semester" :value="semester">{{ semester }}º período</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="profileJoinDate">Entrou na comunidade</label>
                                <input id="profileJoinDate" v-model="form.join_date" type="month">
                            </div>
                            <div class="form-group">
                                <label for="profileStatus">Status</label>
                                <select id="profileStatus" v-model="form.status">
                                    <option value="online">🟢 Online</option>
                                    <option value="away">🟡 Ausente</option>
                                    <option value="offline">⚪ Offline</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="edit-section">
                        <div class="edit-section-title">Sobre mim</div>
                        <div class="form-group">
                            <label for="profileBio">Biografia</label>
                            <textarea id="profileBio" v-model="form.bio" rows="4" maxlength="500" placeholder="Conte um pouco sobre você e seus interesses como jogador..."></textarea>
                        </div>
                    </div>

                    <div class="edit-section">
                        <div class="edit-section-title">Aparência</div>
                        <div class="profile-image-edit-grid">
                            <div class="profile-image-edit-card">
                                <div class="profile-image-edit-preview avatar-preview">
                                    <img v-if="avatarPreviewUrl" :src="avatarPreviewUrl" alt="Prévia da foto de perfil">
                                    <span v-else>👤</span>
                                </div>
                                <div class="profile-image-edit-copy">
                                    <strong>Foto de perfil</strong>
                                    <small>Recorte quadrado com ajuste de zoom e posição.</small>
                                    <button type="button" class="profile-image-select-button" @click="openFilePicker('avatar')">
                                        {{ avatarPreviewUrl ? "Trocar e ajustar" : "Selecionar e ajustar" }}
                                    </button>
                                </div>
                                <input id="profileAvatar" ref="avatarInput" class="profile-image-file-input" type="file" accept="image/jpeg,image/png,image/webp" @change="emitFile('avatar', $event)">
                            </div>
                            <div class="profile-image-edit-card">
                                <div class="profile-image-edit-preview cover-preview">
                                    <img v-if="coverPreviewUrl" :src="coverPreviewUrl" alt="Prévia da imagem de capa">
                                    <span v-else>🖼️</span>
                                </div>
                                <div class="profile-image-edit-copy">
                                    <strong>Banner / capa</strong>
                                    <small>Enquadramento horizontal para a capa do perfil.</small>
                                    <button type="button" class="profile-image-select-button" @click="openFilePicker('cover')">
                                        {{ coverPreviewUrl ? "Trocar e ajustar" : "Selecionar e ajustar" }}
                                    </button>
                                </div>
                                <input id="profileCover" ref="coverInput" class="profile-image-file-input" type="file" accept="image/jpeg,image/png,image/webp" @change="emitFile('cover', $event)">
                            </div>
                        </div>
                    </div>

                    <div class="edit-section">
                        <div class="edit-section-title">Plataformas</div>
                        <div class="checkbox-grid">
                            <label v-for="platform in platforms" :key="platform.value" class="check-option">
                                <input v-model="form.platforms" type="checkbox" :value="platform.value" name="platform">
                                <span>{{ platform.label }}</span>
                            </label>
                        </div>
                    </div>

                    <div class="edit-section">
                        <div class="edit-section-title">Gêneros favoritos</div>
                        <div class="checkbox-grid">
                            <label v-for="genre in genres" :key="genre" class="check-option">
                                <input v-model="form.genres" type="checkbox" :value="genre" name="genre">
                                <span>{{ genre }}</span>
                            </label>
                        </div>
                    </div>

                    <p v-if="form.error" class="profile-form-error" role="alert">{{ form.error }}</p>

                    <div class="modal-actions">
                        <button type="button" class="modal-cancel" :disabled="saving" @click="close">Cancelar</button>
                        <button type="submit" class="btn btn-primary" :disabled="saving">
                            {{ saving ? "Salvando..." : "Salvar alterações" }}
                        </button>
                    </div>
                </form>
            </section>
        </div>
        <ImageCropper
            v-if="cropperFile"
            :file="cropperFile"
            :kind="cropperKind"
            :aspect-ratio="cropperAspectRatio"
            @cancel="cancelCrop"
            @confirm="confirmCrop"
        />
    </Teleport>
</template>

<style>
.profile-form-error {
    color: #fca5a5;
    font-size: 13px;
    margin: 8px 0 0;
}
.profile-modal small {
    display: block;
    margin-top: 7px;
    color: #94a3b8;
    font-size: 11px;
}
.profile-modal button:disabled {
    cursor: not-allowed;
    opacity: .65;
}
.profile-image-edit-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}
.profile-image-edit-card {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 12px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
    background: rgba(3,7,18,.42);
}
.profile-image-edit-preview {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    overflow: hidden;
    color: #94a3b8;
    background: #1e293b;
}
.profile-image-edit-preview img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.profile-image-edit-preview.avatar-preview {
    width: 66px;
    height: 66px;
    border-radius: 16px;
}
.profile-image-edit-preview.cover-preview {
    width: 88px;
    height: 56px;
    border-radius: 9px;
}
.profile-image-edit-preview span { font-size: 24px; }
.profile-image-edit-copy { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.profile-image-edit-copy strong { color: #e2e8f0; font-size: 12px; }
.profile-image-edit-copy small { margin: 0; line-height: 1.4; }
.profile-image-select-button {
    margin-top: 4px;
    padding: 7px 10px;
    color: #fda4af;
    background: rgba(127,29,29,.22);
    border: 1px solid rgba(248,113,113,.22);
    border-radius: 8px;
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
}
.profile-image-select-button:hover { background: rgba(127,29,29,.38); }
.profile-image-file-input { display: none !important; }
@media (max-width: 620px) {
    .profile-image-edit-grid { grid-template-columns: 1fr; }
}
</style>
