<template>
  <div class="h-split">
    <!-- <Editor v-model:value="template"></Editor> -->
    <div class="preview-pane">
      <Preview :html="html" />
    </div>
    
  </div>
</template>

<script setup>
// Helpers
import { ref } from "vue";
import { invoke } from "@vueuse/core";

// Components
import Editor from "./components/Editor.vue";
import Preview from "./components/Preview.vue";

// Internal
const rendererEndpoint = import.meta.env.VITE_RENDERER_ENDPOINT;
const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT;

// Template vars
const templateUrl = ref("/templates/base/index.html");
const templateData = ref({});
const html = ref("");
const template = ref("");
const query = ref(`
  query($organizationId: uuid!, $channels: [String!]!){
    organization: organizationsByPk(id: $organizationId) {
      id
      title
      primaryColor
      secondaryColor
      exteriorPhotoUrl
      logoImageUrl
      website
      facebook
      instagram
      twitter
    }

    messages(
      limit: 10
      order_by: { publishDateTime: desc }
      where: {
        ownerOrganizationId: { _eq: $organizationId }
        status: { _eq: "Published" }
        channels: { channel: { title: { _in: $channels } } }
        tags: { tag: { title: { _in: ["School Homepage", "District Homepage"] } } }
      }
    ) {
      title
      summary
      bodyHtml
      slug
      links(where: { link: { type: { _eq: "Call to Action" } } }) {
        link {
          title
          url
        }
      }
      firstImageFiles: images(path: "$.[0].files"),
      firstImage: images(path: "$.[0].files[0]")
    }
  }
`);

// Load the template

const loadTemplate = async () => {
  template.value = await fetch(templateUrl.value).then((t) => t.text());

  
  const { data: queryResults } = await fetch(graphqlEndpoint,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: query.value,
      variables: {
        // channels: ["News & Stories"],
        channels: ["News & Stories", "Announcements"],
        // District
        organizationId: "26eaf390-d8ab-11e9-a3a8-5de5bba4f125",
        // Air Academy
        // organizationId: "bb6e9cd6-da25-9e6f-5e8d-072b9a7df4f0",
        // Pine Creek
        // organizationId: "3ace095e-c792-6fa8-3299-a0db26db81dd",
        // Mountain Ridge
        // organizationId: "3f8d7fa9-682e-5599-6403-1d61e5d75142",
        // "Chinook Trail Middle School",
        // organizationId:"03ee3ad3-70cc-2090-8313-293ad07426eb"
      }
    }),
  }).then((t) => t.json());

  templateData.value = queryResults;

  const data = await fetch(rendererEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template: template.value,
      data: {
        ...templateData.value
      },
    }),
  }).then((t) => t.text());
  

  // Use regex to minify html
  const minified = data
    .replace(/\>[\r\n ]+\</g, "><")
    .replace(/(<.*?>)|\s+/g, (m, $1) => $1 ? $1 : ' ')
    .replace('!doctype', '!DOCTYPE').trim();

  console.log(minified);

  html.value = data;
};

loadTemplate();
</script>

<style>
body {
  margin: 0;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  display: flex;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
.h-split {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
}
.h-split > * {
  width: 100%;
  height: 100%;
}
</style>
