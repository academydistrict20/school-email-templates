import dotenv from 'dotenv';
import fetch from 'node-fetch';
import htmlMinifier from 'html-minifier'
import { readFile, writeFile } from 'fs/promises';
import {  existsSync, mkdirSync } from 'fs';

dotenv.config();

async function fetchOrganizations()
{
    const response = await fetch(process.env.GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: `query($channels: [String!]!){
          organizations {
            id
            title
            abbreviation
            primaryColor
            secondaryColor
            exteriorPhotoUrl
            logoImageUrl
            website
            facebook
            instagram
            twitter
            messages(
              limit: 5
              order_by: { publishDateTime: desc }
              where: {
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
        }`,
        variables: {
          channels: ["News & Stories", "Announcements"],
        }
      })
    });
    const { data, errors} = await response.json();
    if (errors) throw new Error(JSON.stringify(errors));
    return (data && data.organizations) ? data.organizations : [];
}

async function getRenderedTemplate(template, organization, title, subtitle) {
  // Separate messages from the rest of the data
  const messages = organization.messages;
  delete organization.messages;

  // Render the template by posting the data and template string to thee render endpoint
  console.log(`Rendering template`);

  const payload = {
    template,
    data: {
      organization,
      title: title || organization.title,
      subtitle: subtitle || `Newsletter, ${new Date().toLocaleDateString()}`,
      messages: [
        {
          id: 1,
          title: 'First Message Title',
          summary: 'Vestibulum id ligula porta felis euismod semper.',
          bodyHtml: '<p>Vestibulum id ligula porta felis euismod semper.</p>',
          slug: 'first-message',
          "firstImageFiles": [
            {
              "url": "https://asd20websitestorage.blob.core.windows.net/website-files/message-images/d88fb870-ac2f-11eb-8ee8-0ddb251a7aeb/banner/Unknown_800x300.jpg",
              "name": "banner",
              "width": 800,
              "height": 300,
              "filename": "Unknown_800x300.jpg",
              "filepath": "message-images/d88fb870-ac2f-11eb-8ee8-0ddb251a7aeb/banner/Unknown_800x300.jpg",
              "filesize": 61814
            }
          ],
          "firstImage": {
            "url": "https://asd20websitestorage.blob.core.windows.net/website-files/message-images/d88fb870-ac2f-11eb-8ee8-0ddb251a7aeb/thumbnail-md/Unknown_250x250.jpg",
            "name": "thumbnail-md",
            "width": 250,
            "height": 250,
            "filename": "Unknown_250x250.jpg",
            "filepath": "message-images/d88fb870-ac2f-11eb-8ee8-0ddb251a7aeb/thumbnail-md/Unknown_250x250.jpg",
            "filesize": 23637
          }
        },
        {
          id: 1,
          title: 'Second Message Title',
          summary: 'Vestibulum id ligula porta felis euismod semper.',
          bodyHtml: '<p>Vestibulum id ligula porta felis euismod semper.</p>',
          slug: 'second-message',
          "firstImageFiles": [],
          "firstImage": {
            "url": "https://asd20websitestorage.blob.core.windows.net/website-files/message-images/d88fb870-ac2f-11eb-8ee8-0ddb251a7aeb/thumbnail-md/Unknown_250x250.jpg",
            "name": "thumbnail-md",
            "width": 250,
            "height": 250,
            "filename": "Unknown_250x250.jpg",
            "filepath": "message-images/d88fb870-ac2f-11eb-8ee8-0ddb251a7aeb/thumbnail-md/Unknown_250x250.jpg",
            "filesize": 23637
          }
        }
      ]
    }
  }

  const response = await fetch(process.env.RENDERER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (response.status !== 200) throw new Error(`${response.status} ${response.statusText}:\n\n ${JSON.stringify(payload)}`);

  const html = await response.text();

  // Add the messages back to the data
  organization.messages = messages;

  // Return the rendered HTML
  return html;
}

async function getTemplateStrings(template) {
  const templatePath = `../templates/${template}/index.html`;
  const templateString = await readFile(templatePath, 'utf8');
  return templateString;
}


const run = async () => {
  const templates = ['base','info-message'];
  console.log(`Generating ${templates.join(', ')}`);
  const templateStrings = await Promise.all(templates.map(async t => ({ name: t, template: await getTemplateStrings(t) })));
  console.log(`${templateStrings.length} templates loaded`)
  console.log(`Fetching organizations`);
  try {
    const organizations = await fetchOrganizations()
    // For each organization, render each of the template
    for (const organization of organizations) {
      console.log(`Processing ${organization.title}`);
      for (const template of templateStrings) {
        console.log(`Rendering ${template.name}`);
        const renderedTemplate = await getRenderedTemplate(template.template, organization);

        const minifiedTemplate = htmlMinifier.minify(renderedTemplate, {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: false,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: false,
          useShortDoctype: true,
          minifyCSS: true,
          minifyJS: true,
        });
        // make the directory if it doesn't exist
        let directory = `../rendered/${organization.abbreviation.toLowerCase()}`;
        if (!existsSync(directory)) mkdirSync(directory)
        directory += `/${template.name}`;
        if (!existsSync(directory)) mkdirSync(directory)
        const templatePath = `${directory}/index.html`;
        await writeFile(templatePath, minifiedTemplate);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

run()