/* =========================================

   ELEMENTOS

========================================= */



const postInput =

    document.getElementById("postInput");



const publishPostButton =

    document.getElementById(

        "publishPostButton"

    );



const characterCounter =

    document.getElementById(

        "characterCounter"

    );



const postsList =

    document.getElementById("postsList");



const feedFilter =

    document.getElementById("feedFilter");



const activeHashtag =

    document.getElementById(

        "activeHashtag"

    );



const clearFilterButton =

    document.getElementById(

        "clearFilterButton"

    );



const trendingGames =

    document.getElementById(

        "trendingGames"

    );





/* =========================================

   JOGOS / HASHTAGS VÁLIDAS



   Futuramente isso poderá vir

   diretamente da API.

========================================= */



const games = [



    {

        name: "Elden Ring",

        hashtag: "eldenring"

    },



    {

        name: "Hollow Knight",

        hashtag: "hollowknight"

    },



    {

        name: "Minecraft",

        hashtag: "minecraft"

    },



    {

        name: "Valorant",

        hashtag: "valorant"

    },



    {

        name: "Terraria",

        hashtag: "terraria"

    },



    {

        name: "Zelda",

        hashtag: "zelda"

    },



    {

        name: "God of War",

        hashtag: "godofwar"

    },



    {

        name: "Stardew Valley",

        hashtag: "stardewvalley"

    },



    {

        name: "Resident Evil 4",

        hashtag: "residentevil4"

    },



    {

        name: "Hades",

        hashtag: "hades"

    },



    {

        name: "Sekiro",

        hashtag: "sekiro"

    },



    {

        name: "Cyberpunk 2077",

        hashtag: "cyberpunk2077"

    },



    {

        name: "Celeste",

        hashtag: "celeste"

    },



    {

        name: "Spider-Man",

        hashtag: "spiderman"

    }



];





/* =========================================

   POSTS INICIAIS

========================================= */



const initialPosts = [



    {

        id: 1,



        author: "Maria",



        username: "@maria",



        avatar: "M",



        content:

            "Finalmente comecei minha segunda run de #eldenring. Dessa vez vou tentar uma build completamente diferente.",



        createdAt: "há 12 min",



        likes: 14,



        reposts: 3,



        liked: false,



        reposted: false,



        comments: [



            {

                author: "Pedro",

                avatar: "P",

                text: "Boa sorte kkk essa segunda run sempre vira mais 100 horas."

            }



        ]



    },



    {

        id: 2,



        author: "Pedro",



        username: "@pedro",



        avatar: "P",



        content:

            "Alguém ainda joga #terraria por aqui? Estou pensando em começar um mundo novo.",



        createdAt: "há 36 min",



        likes: 9,



        reposts: 1,



        liked: false,



        reposted: false,



        comments: []



    },



    {

        id: 3,



        author: "Lucas",



        username: "@lucas",



        avatar: "L",



        content:

            "Terminei #hollowknight ontem. Agora entendi por que tanta gente gosta desse jogo.",



        createdAt: "há 1 h",



        likes: 22,



        reposts: 5,



        liked: false,



        reposted: false,



        comments: [



            {

                author: "Mariana",

                avatar: "M",

                text: "Agora é esperar Silksong 😅"

            }



        ]



    },



    {

        id: 4,



        author: "Ana",



        username: "@ana",



        avatar: "A",



        content:

            "Dia tranquilo jogando #minecraft e esquecendo completamente que tenho trabalho para entregar.",



        createdAt: "há 2 h",



        likes: 18,



        reposts: 2,



        liked: false,



        reposted: false,



        comments: []



    }



];







/* =========================================
   ARMAZENAMENTO LOCAL

   Solução temporária enquanto o projeto
   ainda não possui banco de dados.
========================================= */

const POSTS_STORAGE_KEY =
    "overclockSocietyFeedPosts";


function cloneInitialPosts() {

    return JSON.parse(
        JSON.stringify(
            initialPosts
        )
    );
}


function loadPosts() {

    const storedPosts =
        localStorage.getItem(
            POSTS_STORAGE_KEY
        );


    if (storedPosts) {

        try {

            const parsedPosts =
                JSON.parse(
                    storedPosts
                );


            if (
                Array.isArray(
                    parsedPosts
                )
            ) {

                return parsedPosts;
            }

        } catch (error) {

            console.warn(
                "Não foi possível carregar os posts salvos.",
                error
            );
        }
    }


    const defaultPosts =
        cloneInitialPosts();


    localStorage.setItem(
        POSTS_STORAGE_KEY,
        JSON.stringify(
            defaultPosts
        )
    );


    return defaultPosts;
}


function savePosts() {

    localStorage.setItem(
        POSTS_STORAGE_KEY,
        JSON.stringify(
            posts
        )
    );
}


let posts =
    loadPosts();


/* =========================================

   FILTRO ATUAL

========================================= */



let currentHashtagFilter = null;





/* =========================================

   UTILIDADES

========================================= */



function normalizeHashtag(value) {



    return value

        .toLowerCase()

        .replace("#", "")

        .trim();

}





function isValidGameHashtag(hashtag) {



    const normalized =

        normalizeHashtag(hashtag);





    return games.some(

        (game) =>

            game.hashtag === normalized

    );

}





function getGameByHashtag(hashtag) {



    const normalized =

        normalizeHashtag(hashtag);





    return games.find(

        (game) =>

            game.hashtag === normalized

    );

}





/* =========================================

   CRIAR TEXTO DO POST

========================================= */



function createPostTextElement(content) {



    const paragraph =

        document.createElement("p");





    paragraph.className =

        "post-text";





    /*

     * Localiza palavras começadas

     * por #.

     */



    const parts =

        content.split(

            /(#[a-zA-ZÀ-ÿ0-9_-]+)/g

        );





    parts.forEach(

        (part) => {



            if (

                part.startsWith("#") &&

                isValidGameHashtag(part)

            ) {



                const hashtag =

                    document.createElement(

                        "button"

                    );





                hashtag.type =

                    "button";





                hashtag.className =

                    "game-hashtag";





                hashtag.textContent =

                    part;





                /*

                 * Remove aparência

                 * padrão do botão.

                 */



                hashtag.style.border =

                    "none";



                hashtag.style.background =

                    "transparent";



                hashtag.style.padding =

                    "0";



                hashtag.style.font =

                    "inherit";





                hashtag.addEventListener(

                    "click",

                    () => {



                        filterByHashtag(

                            part

                        );



                    }

                );





                paragraph.appendChild(

                    hashtag

                );



            } else {



                paragraph.appendChild(

                    document.createTextNode(

                        part

                    )

                );



            }



        }

    );





    return paragraph;

}





/* =========================================

   RENDERIZAR POSTS

========================================= */



function renderPosts() {



    postsList.innerHTML = "";





    let visiblePosts =

        posts;





    if (currentHashtagFilter) {



        visiblePosts =

            posts.filter(

                (post) => {



                    const regex =

                        new RegExp(

                            `#${currentHashtagFilter}\\b`,

                            "i"

                        );





                    return regex.test(

                        post.content

                    );



                }

            );



    }





    if (

        visiblePosts.length === 0

    ) {



        const empty =

            document.createElement(

                "div"

            );





        empty.className =

            "empty-feed";





        empty.textContent =

            "Nenhuma publicação encontrada.";





        postsList.appendChild(

            empty

        );





        return;

    }





    visiblePosts.forEach(

        (post) => {



            postsList.appendChild(

                createPostCard(

                    post

                )

            );



        }

    );



}





/* =========================================

   PERFIL DE OUTRO USUÁRIO

   Nesta fase apenas Maria possui um perfil
   demonstrativo.

========================================= */

function enableDemoUserProfileLink(
    element,
    username
) {

    if (
        String(username)
            .trim()
            .toLowerCase() !==
        "@maria"
    ) {

        return;
    }


    const openProfile = () => {

        window.location.href =
            "perfil-usuario.html?user=maria";
    };


    element.classList.add(
        "user-profile-link"
    );

    element.tabIndex = 0;

    element.setAttribute(
        "role",
        "link"
    );

    element.setAttribute(
        "aria-label",
        "Abrir perfil de Maria"
    );


    element.addEventListener(
        "click",
        openProfile
    );


    element.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();
                openProfile();
            }
        }
    );
}


/* =========================================

   CRIAR CARD

========================================= */



function createPostCard(post) {



    const article =

        document.createElement(

            "article"

        );





    article.className =

        "post-card";





    /* HEADER */



    const header =

        document.createElement(

            "div"

        );





    header.className =

        "post-header";





    const avatar =

        document.createElement(

            "div"

        );





    avatar.className =

        "post-avatar";





    avatar.textContent =

        post.avatar;





    const user =

        document.createElement(

            "div"

        );





    user.className =

        "post-user";





    const userLine =

        document.createElement(

            "div"

        );





    userLine.className =

        "post-user-line";





    const author =

        document.createElement(

            "strong"

        );





    author.textContent =

        post.author;





    const username =

        document.createElement(

            "span"

        );





    username.className =

        "post-username";





    username.textContent =

        post.username;





    enableDemoUserProfileLink(
        avatar,
        post.username
    );

    enableDemoUserProfileLink(
        author,
        post.username
    );

    enableDemoUserProfileLink(
        username,
        post.username
    );





    const time =

        document.createElement(

            "span"

        );





    time.className =

        "post-time";





    time.textContent =

        `• ${post.createdAt}`;





    userLine.append(

        author,

        username,

        time

    );





    user.appendChild(

        userLine

    );





    user.appendChild(

        createPostTextElement(

            post.content

        )

    );





    header.append(

        avatar,

        user

    );





    article.appendChild(

        header

    );





    /* AÇÕES */



    const actions =

        document.createElement(

            "div"

        );





    actions.className =

        "post-actions";





    const commentButton =

        createActionButton(

            "💬",

            post.comments.length,

            "Comentar"

        );





    const repostButton =

        createActionButton(

            "🔁",

            post.reposts,

            "Repostar"

        );





    const likeButton =

        createActionButton(

            post.liked

                ? "❤️"

                : "♡",



            post.likes,



            "Curtir"

        );





    if (post.liked) {



        likeButton.classList.add(

            "liked"

        );

    }





    if (post.reposted) {



        repostButton.classList.add(

            "reposted"

        );

    }





    actions.append(

        commentButton,

        repostButton,

        likeButton

    );





    article.appendChild(

        actions

    );





    /* COMENTÁRIOS */



    const commentsSection =

        createCommentsSection(

            post

        );





    article.appendChild(

        commentsSection

    );





    /* EVENTOS */



    commentButton.addEventListener(

        "click",

        () => {



            commentsSection.classList.toggle(

                "active"

            );



        }

    );





    likeButton.addEventListener(

        "click",

        () => {



            toggleLike(

                post.id

            );



        }

    );





    repostButton.addEventListener(

        "click",

        () => {



            toggleRepost(

                post.id

            );



        }

    );





    return article;

}





/* =========================================

   BOTÃO DE AÇÃO

========================================= */



function createActionButton(

    icon,

    count,

    label

) {



    const button =

        document.createElement(

            "button"

        );





    button.type =

        "button";





    button.className =

        "post-action";





    button.innerHTML =

        `<span>${icon}</span>

         <span>${count}</span>

         <span>${label}</span>`;





    return button;

}





/* =========================================

   COMENTÁRIOS

========================================= */



function createCommentsSection(post) {



    const section =

        document.createElement(

            "div"

        );





    section.className =

        "comments-section";





    const list =

        document.createElement(

            "div"

        );





    list.className =

        "comments-list";





    post.comments.forEach(

        (comment) => {



            const commentElement =

                createComment(

                    comment

                );





            list.appendChild(

                commentElement

            );



        }

    );





    const form =

        document.createElement(

            "form"

        );





    form.className =

        "comment-form";





    const input =

        document.createElement(

            "input"

        );





    input.type =

        "text";





    input.placeholder =

        "Escreva um comentário...";





    input.maxLength =

        180;





    const button =

        document.createElement(

            "button"

        );





    button.type =

        "submit";





    button.textContent =

        "Enviar";





    form.append(

        input,

        button

    );





    form.addEventListener(

        "submit",

        (event) => {



            event.preventDefault();





            const text =

                input.value.trim();





            if (!text) {



                return;

            }





            post.comments.push({



                author:

                    "João",



                avatar:

                    "J",



                text



            });





            savePosts();


            renderPosts();



        }

    );





    section.append(

        list,

        form

    );





    return section;

}





/* =========================================

   CRIAR COMENTÁRIO

========================================= */



function createComment(comment) {



    const element =

        document.createElement(

            "div"

        );





    element.className =

        "comment";





    const avatar =

        document.createElement(

            "div"

        );





    avatar.className =

        "comment-avatar";





    avatar.textContent =

        comment.avatar;





    const body =

        document.createElement(

            "div"

        );





    body.className =

        "comment-body";





    const user =

        document.createElement(

            "div"

        );





    user.className =

        "comment-user";





    user.textContent =

        comment.author;





    const text =

        document.createElement(

            "div"

        );





    text.className =

        "comment-text";





    text.textContent =

        comment.text;





    body.append(

        user,

        text

    );





    element.append(

        avatar,

        body

    );





    return element;

}





/* =========================================

   CURTIR

========================================= */



function toggleLike(postId) {



    const post =

        posts.find(

            (post) =>

                post.id === postId

        );





    if (!post) {



        return;

    }





    post.liked =

        !post.liked;





    post.likes +=

        post.liked

            ? 1

            : -1;





    savePosts();


    renderPosts();

}





/* =========================================

   REPOSTAR

========================================= */



function toggleRepost(postId) {



    const post =

        posts.find(

            (post) =>

                post.id === postId

        );





    if (!post) {



        return;

    }





    post.reposted =

        !post.reposted;





    post.reposts +=

        post.reposted

            ? 1

            : -1;





    savePosts();


    renderPosts();

}





/* =========================================

   PUBLICAR

========================================= */



function publishPost() {



    const content =

        postInput.value.trim();





    if (!content) {



        return;

    }





    const newPost = {



        id:

            Date.now(),

        userId:
            "current-user",



        author:

            "João",



        username:

            "@joao123",



        avatar:

            "J",



        content,



        createdAt:

            "agora",



        likes:

            0,



        reposts:

            0,



        liked:

            false,



        reposted:

            false,



        comments:

            []



    };





    posts.unshift(

        newPost

    );





    savePosts();


    postInput.value =

        "";





    updateCharacterCounter();





    /*

     * Remove filtro para o usuário

     * enxergar imediatamente o post

     * publicado.

     */



    clearHashtagFilter();





    renderPosts();



    renderTrendingGames();

}





/* =========================================

   FILTRAR POR HASHTAG

========================================= */



function filterByHashtag(hashtag) {



    const normalized =

        normalizeHashtag(hashtag);





    if (

        !isValidGameHashtag(

            normalized

        )

    ) {



        return;

    }





    currentHashtagFilter =

        normalized;





    const game =

        getGameByHashtag(

            normalized

        );





    activeHashtag.textContent =

        `#${game.hashtag}`;





    feedFilter.classList.add(

        "active"

    );





    renderPosts();





    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}





/* =========================================

   LIMPAR FILTRO

========================================= */



function clearHashtagFilter() {



    currentHashtagFilter =

        null;





    feedFilter.classList.remove(

        "active"

    );

}





/* =========================================

   TENDÊNCIAS

========================================= */



function renderTrendingGames() {



    trendingGames.innerHTML =

        "";





    const ranking =

        games

            .map(

                (game) => {



                    const regex =

                        new RegExp(

                            `#${game.hashtag}\\b`,

                            "gi"

                        );





                    const postsCount =

                        posts.filter(

                            (post) =>

                                regex.test(

                                    post.content

                                )

                        ).length;





                    return {

                        ...game,

                        postsCount

                    };



                }

            )

            .filter(

                (game) =>

                    game.postsCount > 0

            )

            .sort(

                (a, b) =>

                    b.postsCount -

                    a.postsCount

            )

            .slice(

                0,

                5

            );





    ranking.forEach(

        (game) => {



            const item =

                document.createElement(

                    "div"

                );





            item.className =

                "trending-game";





            const left =

                document.createElement(

                    "div"

                );





            const name =

                document.createElement(

                    "strong"

                );





            name.textContent =

                `#${game.hashtag}`;





            const gameName =

                document.createElement(

                    "span"

                );





            gameName.textContent =

                game.name;





            left.append(

                name,

                gameName

            );





            const count =

                document.createElement(

                    "span"

                );





            count.textContent =

                `${game.postsCount} posts`;





            item.append(

                left,

                count

            );





            item.addEventListener(

                "click",

                () => {



                    filterByHashtag(

                        game.hashtag

                    );



                }

            );





            trendingGames.appendChild(

                item

            );



        }

    );



}





/* =========================================

   CONTADOR

========================================= */



function updateCharacterCounter() {



    characterCounter.textContent =

        `${postInput.value.length} / 280`;

}





/* =========================================

   PESQUISA

========================================= */



const searchInput =

    document.getElementById(

        "searchInput"

    );





searchInput.addEventListener(

    "input",

    () => {



        const term =

            searchInput.value

                .trim()

                .toLowerCase();





        document

            .querySelectorAll(

                ".post-card"

            )

            .forEach(

                (card) => {



                    const text =

                        card.textContent

                            .toLowerCase();





                    card.style.display =

                        text.includes(term)

                            ? ""

                            : "none";



                }

            );



    }

);





/* =========================================

   PERFIL

========================================= */



const profileButton =

    document.getElementById(

        "profileButton"

    );





if (profileButton) {



    profileButton.addEventListener(

        "click",

        () => {



            window.location.href =

                "perfil.html";



        }

    );

}





/* =========================================

   EVENTOS

========================================= */



postInput.addEventListener(

    "input",

    updateCharacterCounter

);





publishPostButton.addEventListener(

    "click",

    publishPost

);





postInput.addEventListener(

    "keydown",

    (event) => {



        if (

            event.ctrlKey &&

            event.key === "Enter"

        ) {



            publishPost();

        }



    }

);





clearFilterButton.addEventListener(

    "click",

    () => {



        clearHashtagFilter();



        renderPosts();



    }

);





/* =========================================

   INICIALIZAÇÃO

========================================= */



const requestedHashtag =
    new URLSearchParams(
        window.location.search
    ).get(
        "hashtag"
    );


if (
    requestedHashtag &&
    isValidGameHashtag(
        requestedHashtag
    )
) {

    filterByHashtag(
        requestedHashtag
    );

} else {

    renderPosts();
}



renderTrendingGames();



updateCharacterCounter();





console.log(

    "📰 Feed carregado com sucesso."

);