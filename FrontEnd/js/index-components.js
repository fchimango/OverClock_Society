/* Componentes reutilizáveis da página inicial do Overclock Society.
 * Este arquivo é carregado após o Vue 3 e antes de index-vue.js.
 * Os componentes não montam aplicações sozinhos: são registrados pelo controlador da página.
 */
(() => {
    "use strict";

    const components = {
        ActionLink: {
            name: "ActionLink",
            props: {
                href: { type: String, required: true },
                label: { type: String, required: true },
                variant: { type: String, required: true },
                showArrow: { type: Boolean, default: false }
            },
            template: `<a :href="href" class="btn" :class="variant">
                {{ label }}
                <span v-if="showArrow" class="button-arrow" aria-hidden="true">→</span>
            </a>`
        },

        StatItem: {
            name: "StatItem",
            props: {
                icon: { type: String, required: true },
                label: { type: String, required: true }
            },
            template: `<div class="stat">
                <strong>{{ icon }}</strong>
                <span>{{ label }}</span>
            </div>`
        },

        FeatureCard: {
            name: "FeatureCard",
            props: {
                icon: { type: String, required: true },
                title: { type: String, required: true },
                description: { type: String, required: true },
                number: { type: String, required: true }
            },
            template: `<article class="feature-card">
                <div class="feature-icon">{{ icon }}</div>
                <h3>{{ title }}</h3>
                <p>{{ description }}</p>
                <span class="feature-number">{{ number }}</span>
            </article>`
        },

        CountdownItem: {
            name: "CountdownItem",
            props: {
                value: { type: String, required: true },
                label: { type: String, required: true }
            },
            template: `<div class="countdown-item">
                <strong>{{ value }}</strong>
                <span>{{ label }}</span>
            </div>`
        }
    };

    Object.defineProperty(window, "OCSIndexComponents", {
        configurable: true,
        enumerable: false,
        writable: false,
        value: Object.freeze(components)
    });
})();
