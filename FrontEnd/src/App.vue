<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import SiteNavbar from "./components/SiteNavbar.vue";
import HeroSection from "./components/HeroSection.vue";
import CommunitySection from "./components/CommunitySection.vue";
import SignupSection from "./components/SignupSection.vue";
import SiteFooter from "./components/SiteFooter.vue";
import HomeModal from "./components/HomeModal.vue";

const homeModal = ref(null);

onMounted(() => {
    // Mantém a API pública do modal usada por scripts antigos e ferramentas de teste.
    window.OverclockHomeModal = Object.freeze({
        open(options) {
            homeModal.value?.open(options);
        },
        close() {
            homeModal.value?.close();
        },
        isOpen() {
            return homeModal.value?.isOpen() ?? false;
        }
    });

    // Flags de compatibilidade com os fallbacks da implementação anterior.
    window.__OCS_VUE_NAVBAR_ACTIVE__ = true;
    window.__OCS_VUE_COUNTDOWN_ACTIVE__ = true;
    window.__OCS_VUE_LEAD_ACTIVE__ = true;
    window.__OCS_VUE_MODAL_ACTIVE__ = true;
});

onBeforeUnmount(() => {
    if (window.OverclockHomeModal) {
        delete window.OverclockHomeModal;
    }
    window.__OCS_VUE_NAVBAR_ACTIVE__ = false;
    window.__OCS_VUE_COUNTDOWN_ACTIVE__ = false;
    window.__OCS_VUE_LEAD_ACTIVE__ = false;
    window.__OCS_VUE_MODAL_ACTIVE__ = false;
});
</script>

<template>
    <SiteNavbar />

    <main>
        <HeroSection />
        <CommunitySection />
        <SignupSection />
    </main>

    <SiteFooter />
    <HomeModal ref="homeModal" />
</template>
