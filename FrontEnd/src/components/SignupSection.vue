<script setup>
import CountdownTimer from "./CountdownTimer.vue";
import LeadSignupForm from "./LeadSignupForm.vue";
</script>

<template>
    <section class="cta" id="entrar">
        <div class="cta-content">
            <span class="section-label">LANÇAMENTO EM BREVE</span>

            <h2>
                Seu próximo squad
                <span>está chegando.</span>
            </h2>

            <p>
                A OverClock Society abre as portas em breve.
                Entre na lista e seja um dos primeiros membros.
            </p>

            <CountdownTimer />
            <LeadSignupForm />
        </div>
    </section>
</template>
