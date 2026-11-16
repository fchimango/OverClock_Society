<script setup>
import { computed } from "vue";
import FeedAvatar from "./FeedAvatar.vue";

const props = defineProps({
    modelValue: { type: String, default: "" },
    userName: { type: String, default: "Usuário" },
    avatarSource: { type: String, default: "" },
    publishing: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "publish"]);
const characterCount = computed(() => props.modelValue.length);
</script>

<template>
    <section class="post-composer">
        <FeedAvatar
            avatar-class="composer-avatar"
            :name="userName"
            :source="avatarSource"
        />

        <div class="composer-content">
            <textarea
                :value="modelValue"
                maxlength="280"
                placeholder="O que está jogando hoje?"
                aria-label="Texto da publicação"
                @input="emit('update:modelValue', $event.target.value)"
                @keydown.ctrl.enter.prevent="emit('publish')"
            ></textarea>

            <div class="composer-footer">
                <div class="composer-info">
                    <span>🎮 Use hashtags como <strong>#eldenring</strong></span>
                    <span>{{ characterCount }} / 280</span>
                </div>
                <button
                    type="button"
                    class="btn btn-primary"
                    :disabled="publishing || !modelValue.trim()"
                    @click="emit('publish')"
                >
                    {{ publishing ? "Publicando..." : "Publicar" }}
                </button>
            </div>
        </div>
    </section>
</template>
