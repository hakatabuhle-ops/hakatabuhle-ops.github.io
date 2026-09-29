const PROFILE_ID = 1;
const STORAGE_BUCKET = "portfolio-files";
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const LOCAL_PROFILE_KEY = "buhle-hakata-portfolio-profile";
const LOCAL_PROJECTS_KEY = "buhle-hakata-portfolio-projects";
const LOCAL_ENTRIES_KEY = "buhle-hakata-portfolio-entries";
const LOCAL_DATABASE = "buhle-hakata-portfolio-local";
const LOCAL_ATTACHMENTS = "attachments";
const DEFAULT_PROFILE = {
  name: "Buhle Hakata",
  study_stage: "ICT student",
  qualification: "Information and Communication Technology",
  university: "Mangosuthu University of Technology",
  location: "Durban, South Africa",
  tagline: "I enjoy learning how technology works and building my skills through coursework and projects. I'm growing my knowledge in ICT and documenting what I learn here.",
  about_lead: "I'm Buhle, an Information and Communication Technology student at Mangosuthu University of Technology.",
  about_body: "I'm building my knowledge one lesson and one project at a time. This portfolio is a growing record of what I learn and make during my studies.",
  about_note: "New here, and excited for what's next.",
  role_title: "Information and Communication Technology Student",
  contact_email: "",
  github_url: "",
  linkedin_url: "",
  other_url: "",
  resume_id: "",
  resume_path: "",
  resume_name: ""
};

const form = document.querySelector("#project-form");
const projectGrid = document.querySelector("#project-grid");
const emptyState = document.querySelector("#empty-state");
const formMessage = document.querySelector("#form-message");
const projectStatus = document.querySelector("#project-status");
const projectFormSubmit = form.querySelector('button[type="submit"]');
const ownerPanel = document.querySelector("#owner-panel");
const loginForm = document.querySelector("#login-form");
const profileEditor = document.querySelector("#profile-editor");
const profileForm = document.querySelector("#profile-form");
const ownerButton = document.querySelector("#owner-button");
const profileMessage = document.querySelector("#profile-message");
const loginMessage = document.querySelector("#login-message");
const entryDialog = document.querySelector("#entry-dialog");
const entryForm = document.querySelector("#entry-form");
const entryFields = document.querySelector("#entry-fields");
const entryMessage = document.querySelector("#entry-message");
let client = null;
let projects = [];
let entries = [];
let editingProject = null;
let editingEntry = null;
let activeEntryType = null;
let profile = { ...DEFAULT_PROFILE };
let signedIn = false;
let localMode = false;

document.querySelector("#current-year").textContent = new Date().getFullYear();
document.querySelector("#print-cv").addEventListener("click", () => window.print());
document.querySelector("#open-project-form").addEventListener("click", () => openProjectForm());
document.querySelector("#empty-add-project").addEventListener("click", () => openProjectForm());
document.querySelector("#close-project-form").addEventListener("click", closeProjectForm);
document.querySelector("#cancel-project").addEventListener("click", closeProjectForm);
document.querySelector("#close-owner-panel").addEventListener("click", () => { ownerPanel.hidden = true; });
document.querySelector("#close-profile-editor").addEventListener("click", () => { profileEditor.hidden = true; });
document.querySelector("#sign-out").addEventListener("click", signOut);
document.querySelectorAll("[data-entry-type]").forEach((button) => {
  button.addEventListener("click", () => openEntryDialog(button.dataset.entryType));
});
document.querySelector("#close-entry-dialog").addEventListener("click", () => entryDialog.close());
document.querySelector("#cancel-entry").addEventListener("click", () => entryDialog.close());
entryForm.addEventListener("submit", saveEntry);
ownerButton.addEventListener("click", toggleOwnerPanel);
form.addEventListener("submit", saveProject);
loginForm.addEventListener("submit", signIn);
profileForm.addEventListener("submit", saveProfile);

initialize();

async function initialize() {
  applyProfile(profile);
  if (!window.PORTFOLIO_CONFIG?.supabaseUrl || !window.PORTFOLIO_CONFIG?.supabaseAnonKey) {
    if (isLocalEnvironment()) {
      enableLocalMode();
    } else {
      ownerButton.hidden = true;
      document.querySelector("#empty-add-project").hidden = true;
      renderEntries();
      renderProjects();
      projectStatus.textContent = "Public site is online. Portfolio editing will be available after secure storage is connected.";
    }
    return;
  }
  if (!window.supabase?.createClient) {
    projectStatus.textContent = "The shared portfolio service could not load. Check your internet connection and reload.";
    return;
  }

  try {
    client = window.supabase.createClient(
      window.PORTFOLIO_CONFIG.supabaseUrl,
      window.PORTFOLIO_CONFIG.supabaseAnonKey,
      { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
    );
    client.auth.onAuthStateChange((_event, session) => {
      setSignedIn(isOwner(session));
    });
    const [{ data: sessionData, error: sessionError }, { data: profileData, error: profileError }] = await Promise.all([
      client.auth.getSession(),
      client.from("portfolio_profile").select("*").eq("id", PROFILE_ID).maybeSingle()
    ]);
    if (sessionError) throw sessionError;
    if (profileError) throw profileError;
    if (profileData) {
      profile = { ...DEFAULT_PROFILE, ...profileData };
      applyProfile(profile);
    }
    setSignedIn(isOwner(sessionData.session));
    await Promise.all([loadProjects(), loadEntries()]);
  } catch (error) {
    projectStatus.textContent = `Could not load the shared portfolio: ${error.message}`;
  }
}

function isLocalEnvironment() {
  return location.protocol === "file:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname.endsWith(".localhost");
}

function enableLocalMode() {
  localMode = true;
  try {
    const savedProfile = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (savedProfile) {
      const saved = JSON.parse(savedProfile);
      if (saved.study_stage === "First-year ICT student") saved.study_stage = DEFAULT_PROFILE.study_stage;
      if (saved.tagline === "Curious about technology. Learning by building. This is where I share my journey, my projects, and the skills I'm growing along the way.") saved.tagline = DEFAULT_PROFILE.tagline;
      if (saved.tagline === "I enjoy learning how technology works and building my skills through coursework and projects. I'm growing my knowledge in ICT and documenting what I learn here.") saved.tagline = DEFAULT_PROFILE.tagline;
      if (saved.tagline === "I build websites and keep growing my skills in web development and ICT. Explore my projects to see what I create and what I'm learning.") saved.tagline = DEFAULT_PROFILE.tagline;
      if (saved.role_title === "Web Developer & ICT Student") saved.role_title = DEFAULT_PROFILE.role_title;
      if (saved.about_lead === "I'm Buhle, a first-year student at Mangosuthu University of Technology, studying Information and Communication Technology.") saved.about_lead = DEFAULT_PROFILE.about_lead;
      if (saved.about_body === "I'm at the beginning of my journey in tech, building my knowledge one lesson and one project at a time. This portfolio is a growing record of what I learn and make during my studies.") saved.about_body = DEFAULT_PROFILE.about_body;
      profile = { ...DEFAULT_PROFILE, ...saved };
    }
    const savedProjects = localStorage.getItem(LOCAL_PROJECTS_KEY);
    if (savedProjects) {
      const parsedProjects = JSON.parse(savedProjects);
      if (!Array.isArray(parsedProjects)) throw new Error("Saved projects are not in the expected format.");
      projects = parsedProjects;
    }
    const savedEntries = localStorage.getItem(LOCAL_ENTRIES_KEY);
    if (savedEntries) {
      const parsedEntries = JSON.parse(savedEntries);
      if (!Array.isArray(parsedEntries)) throw new Error("Saved skills and experience are not in the expected format.");
      entries = parsedEntries;
    }
    applyProfile(profile);
    renderProfileLinks();
    renderEntries();
    setSignedIn(true);
    renderProjects();
    projectStatus.textContent = "Local mode: your projects are saved in this browser only and are not visible to visitors.";
  } catch (error) {
    projectStatus.textContent = `Local portfolio could not be loaded: ${error.message}`;
  }
}

function isOwner(session) {
  return Boolean(
    session?.user?.id &&
    window.PORTFOLIO_CONFIG.ownerUserId &&
    session.user.id === window.PORTFOLIO_CONFIG.ownerUserId
  );
}

function applyProfile(data) {
  const fullName = data.name || DEFAULT_PROFILE.name;
  document.querySelector("#profile-name").textContent = `${fullName}.`;
  document.querySelector("#hero-status").textContent = [data.study_stage, data.location].filter(Boolean).join(" · ");
  document.querySelector("#profile-tagline").textContent = data.tagline;
  document.querySelector("#profile-qualification").textContent = data.qualification;
  document.querySelector("#profile-university").textContent = data.university;
  document.querySelector("#profile-about-lead").textContent = data.about_lead;
  document.querySelector("#profile-about-body").textContent = data.about_body;
  document.querySelector("#profile-about-note").textContent = data.about_note;
  document.querySelector("#profile-role").textContent = data.role_title || `${data.qualification} Student`;
  document.querySelector("#education-university").textContent = data.university;
  document.querySelector("#education-qualification").textContent = data.qualification;
  document.querySelector("#education-stage").textContent = data.study_stage;
  document.title = `${fullName} | ICT Student & Portfolio`;
  const resumeLink = document.querySelector("#resume-link");
  resumeLink.hidden = !(data.resume_id || data.resume_path);
  if (data.resume_path && client) {
    resumeLink.href = client.storage.from(STORAGE_BUCKET).getPublicUrl(data.resume_path).data.publicUrl;
    resumeLink.target = "_blank";
    resumeLink.rel = "noopener noreferrer";
  } else if (data.resume_id) {
    resumeLink.href = "#";
    resumeLink.onclick = (event) => downloadLocalResume(event);
  }
  renderProfileLinks();
}

function setSignedIn(value) {
  signedIn = value;
  ownerButton.textContent = value ? (localMode ? "Manage portfolio (local)" : "Edit my profile") : "Owner login";
  document.querySelector("#open-project-form").hidden = !value;
  document.querySelectorAll("[data-entry-type]").forEach((button) => { button.hidden = !value; });
  document.querySelector("#sign-out").hidden = localMode;
  document.querySelector("#profile-editor-eyebrow").textContent = localMode ? "LOCAL PROFILE · THIS BROWSER ONLY" : "YOUR PUBLIC PROFILE";
  document.querySelector("#local-mode-note").hidden = !localMode;
  loginForm.hidden = value;
  if (projects.length) renderProjects();
  renderEntries();
  if (!value) {
    profileEditor.hidden = true;
    if (!form.hidden) closeProjectForm();
  }
}

function toggleOwnerPanel() {
  ownerPanel.hidden = !ownerPanel.hidden;
  if (ownerPanel.hidden) return;
  profileEditor.hidden = !signedIn;
  if (signedIn) {
    populateProfileForm();
    profileEditor.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    loginForm.scrollIntoView({ behavior: "smooth", block: "start" });
    loginForm.querySelector('input[name="email"]').focus();
  }
}

async function signIn(event) {
  event.preventDefault();
  loginMessage.textContent = "";
  if (!client) {
    loginMessage.textContent = "Connect Supabase first by following the setup steps in README.md.";
    return;
  }
  const data = new FormData(loginForm);
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = "Signing in...";
  try {
    const { error } = await client.auth.signInWithPassword({
      email: data.get("email").trim(),
      password: data.get("password")
    });
    if (error) throw error;
    const { data: sessionData } = await client.auth.getSession();
    if (!isOwner(sessionData.session)) {
      await client.auth.signOut();
      throw new Error("This account is not configured as the portfolio owner.");
    }
    setSignedIn(true);
    loginForm.reset();
    profileEditor.hidden = false;
    populateProfileForm();
    await Promise.all([loadProjects(), loadEntries()]);
  } catch (error) {
    loginMessage.textContent = `Sign-in failed: ${error.message}`;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Sign in <span aria-hidden="true">↗</span>';
  }
}

async function signOut() {
  if (localMode) {
    ownerPanel.hidden = true;
    return;
  }
  try {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    setSignedIn(false);
    ownerPanel.hidden = true;
  } catch (error) {
    profileMessage.textContent = `Sign-out failed: ${error.message}`;
  }
}

function populateProfileForm() {
  for (const [key, value] of Object.entries(profile)) {
    if (key === "resume_id" || key === "resume_path" || key === "resume_name") continue;
    const field = profileForm.elements.namedItem(key);
    if (field) field.value = value ?? "";
  }
  profileMessage.textContent = "";
  const resume = document.querySelector("#existing-resume");
  resume.textContent = profile.resume_name ? `Current CV: ${profile.resume_name}. Choose a new PDF to replace it.` : "No CV uploaded yet.";
  resume.hidden = false;
}

async function saveProfile(event) {
  event.preventDefault();
  profileMessage.textContent = "";
  const saveButton = profileForm.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  const data = new FormData(profileForm);
  const updated = Object.fromEntries(
    ["name", "study_stage", "qualification", "university", "location", "tagline", "about_lead", "about_body", "about_note",
      "role_title", "contact_email", "github_url", "linkedin_url", "other_url"]
      .map((key) => [key, String(data.get(key) ?? "").trim()])
  );
  try {
    updated.contact_email = normalizeContactEmail(updated.contact_email);
    updated.github_url = normalizeProfileUrl("GitHub", updated.github_url);
    updated.linkedin_url = normalizeProfileUrl("LinkedIn", updated.linkedin_url);
    updated.other_url = normalizeWebUrl(updated.other_url);
  } catch (error) {
    profileMessage.textContent = error.message;
    saveButton.disabled = false;
    saveButton.innerHTML = 'Save profile <span aria-hidden="true">↗</span>';
    return;
  }
  const resume = data.get("resume");
  let uploadedResumePath = null;
  const previousResumePath = profile.resume_path;
  try {
    if (localMode) {
      let resumeId = profile.resume_id;
      let resumeName = profile.resume_name;
      if (resume.size > 0) {
        validateResume(resume);
        resumeId = createId();
        await storeLocalAttachment(resumeId, resume);
        resumeName = resume.name;
      }
      profile = { ...profile, ...updated, resume_id: resumeId, resume_name: resumeName };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
      applyProfile(profile);
      profileMessage.textContent = "Profile saved in this browser. Connect Supabase to publish it for visitors.";
      return;
    }
    let resumePath = profile.resume_path;
    let resumeName = profile.resume_name;
    if (resume.size > 0) {
      validateResume(resume);
      uploadedResumePath = `resumes/${createId()}-${safeFileName(resume.name)}`;
      const { error: uploadError } = await client.storage.from(STORAGE_BUCKET).upload(uploadedResumePath, resume, {
        contentType: "application/pdf",
        upsert: false
      });
      if (uploadError) throw uploadError;
      resumePath = uploadedResumePath;
      resumeName = resume.name;
    }
    const { data: savedProfile, error } = await client
      .from("portfolio_profile")
      .update({ ...updated, resume_path: resumePath, resume_name: resumeName })
      .eq("id", PROFILE_ID)
      .select()
      .single();
    if (error) throw error;
    profile = { ...DEFAULT_PROFILE, ...savedProfile };
    applyProfile(profile);
    profileMessage.textContent = "Your public profile has been updated.";
    if (uploadedResumePath && previousResumePath) {
      const { error: removeError } = await client.storage.from(STORAGE_BUCKET).remove([previousResumePath]);
      if (removeError) profileMessage.textContent = `Profile was saved, but the previous CV could not be removed: ${removeError.message}`;
    }
  } catch (error) {
    if (uploadedResumePath) {
      const { error: removeError } = await client.storage.from(STORAGE_BUCKET).remove([uploadedResumePath]);
      if (removeError) console.error("Could not clean up an unsaved resume upload.", removeError);
    }
    profileMessage.textContent = `Profile could not be saved: ${error.message}`;
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = 'Save profile <span aria-hidden="true">↗</span>';
  }
}

function validateResume(file) {
  if (file.size > MAX_ATTACHMENT_SIZE) throw new Error("The CV must be no larger than 10 MB.");
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Choose a PDF file for your CV.");
  }
}

async function loadProjects() {
  const { data, error } = await client
    .from("portfolio_projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  projects = data ?? [];
  renderProjects();
  projectStatus.textContent = projects.length
    ? "Projects are shared with every visitor."
    : signedIn
      ? "No projects yet. Add your first project."
      : "No projects have been published yet.";
}

function openProjectForm(project = null) {
  if (!signedIn) return;
  editingProject = project;
  form.reset();
  clearMessage();
  document.querySelector("#project-form-title").textContent = project ? "Update your project." : "Share something you've made.";
  projectFormSubmit.innerHTML = project ? 'Update project <span aria-hidden="true">↗</span>' : 'Save project <span aria-hidden="true">↗</span>';
  const attachmentLabel = document.querySelector("#existing-attachment");
  if (project) {
    form.elements.namedItem("title").value = project.title;
    form.elements.namedItem("category").value = project.category || "Project";
    form.elements.namedItem("date").value = project.date || "";
    form.elements.namedItem("description").value = project.description;
    form.elements.namedItem("link").value = project.link || "";
    form.elements.namedItem("github_url").value = project.github_url || "";
    form.elements.namedItem("demo_url").value = project.demo_url || "";
    form.elements.namedItem("tech_stack").value = (project.tech_stack || []).join(", ");
    form.elements.namedItem("features").value = (project.features || []).join("\n");
    attachmentLabel.textContent = project.attachment_name
      ? `Current attachment: ${project.attachment_name}. Choose another file to replace it.`
      : "No attachment on this project.";
    attachmentLabel.hidden = false;
  } else {
    attachmentLabel.hidden = true;
  }
  form.hidden = false;
  form.querySelector('input[name="title"]').focus();
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function closeProjectForm() {
  form.hidden = true;
  form.reset();
  editingProject = null;
  document.querySelector("#existing-attachment").hidden = true;
  clearMessage();
}

function showMessage(message) {
  formMessage.textContent = message;
}

function clearMessage() {
  formMessage.textContent = "";
}

function isSafeLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeWebUrl(value) {
  const text = cleanCopiedValue(value).replace(/^<([^<>]+)>$/, "$1");
  if (!text) return "";
  if (/\s/.test(text)) throw new Error("Remove spaces from the profile link and try again.");
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text.replace(/^\/\//, "")}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    if (!url.hostname.includes(".")) throw new Error();
    return url.href;
  } catch {
    throw new Error("Please paste a valid profile link, such as linkedin.com/in/your-name.");
  }
}

function cleanCopiedValue(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .trim();
}

function normalizeContactEmail(value) {
  let email = cleanCopiedValue(value).replace(/^mailto:/i, "");
  const wrappedAddress = email.match(/<([^<>]+)>$/);
  if (wrappedAddress) email = wrappedAddress[1].trim();
  if (!email) return "";

  const validEmail = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
  if (email.length > 254 || !validEmail.test(email)) {
    throw new Error("Enter a valid email address, for example name@example.com.");
  }
  return email;
}

function normalizeProfileUrl(label, value) {
  let text = cleanCopiedValue(value);
  if (!text) return "";
  if (!/[./:]/.test(text)) {
    text = text.replace(/^@/, "");
    if (label === "GitHub" && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(text)) {
      return `https://github.com/${text}`;
    }
    if (label === "LinkedIn" && /^[A-Za-z0-9-]{1,100}$/.test(text)) {
      return `https://www.linkedin.com/in/${text}/`;
    }
  }
  const url = normalizeWebUrl(text);
  return label === "GitHub" ? normalizeSocialUrl(label, url) : url;
}

function safeFileName(name) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "attachment";
}

function splitLines(value) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function splitLinesOrComma(value) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

async function downloadLocalResume(event) {
  event.preventDefault();
  try {
    const database = await openLocalDatabase();
    const file = await new Promise((resolve, reject) => {
      const transaction = database.transaction(LOCAL_ATTACHMENTS, "readonly");
      const request = transaction.objectStore(LOCAL_ATTACHMENTS).get(profile.resume_id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not load the saved CV."));
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => database.close();
    });
    if (!file) throw new Error("The CV is no longer available in this browser.");
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = profile.resume_name || "Buhle-Hakata-CV.pdf";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    profileMessage.textContent = `CV could not be downloaded: ${error.message}`;
    ownerPanel.hidden = false;
    profileEditor.hidden = false;
  }
}

async function saveProject(event) {
  event.preventDefault();
  clearMessage();
  const data = new FormData(form);
  const title = String(data.get("title") ?? "").trim();
  const description = String(data.get("description") ?? "").trim();
  const link = String(data.get("link") ?? "").trim();
  const githubUrl = String(data.get("github_url") ?? "").trim();
  const demoUrl = String(data.get("demo_url") ?? "").trim();
  const attachment = data.get("attachment");

  if (!title || !description) {
    showMessage("Add a title and a short description before saving.");
    return;
  }
  if (link && !isSafeLink(link)) {
    showMessage("Enter a complete project link that starts with https:// or http://.");
    return;
  }
  if ((githubUrl && !isSafeLink(githubUrl)) || (demoUrl && !isSafeLink(demoUrl))) {
    showMessage("Repository and demo links must start with https:// or http://.");
    return;
  }
  if (attachment.size > MAX_ATTACHMENT_SIZE) {
    showMessage("The attachment is larger than 10 MB. Choose a smaller file.");
    return;
  }

  projectFormSubmit.disabled = true;
  projectFormSubmit.textContent = "Saving...";
  let uploadedPath = null;
  try {
    if (localMode) {
      let attachmentId = editingProject?.attachment_id ?? null;
      let attachmentName = editingProject?.attachment_name ?? null;
      if (attachment.size > 0) {
        attachmentId = createId();
        await storeLocalAttachment(attachmentId, attachment);
        attachmentName = attachment.name;
      }
      const project = {
        id: editingProject?.id ?? createId(),
        title,
        description,
        category: data.get("category"),
        date: data.get("date") || "",
        link,
        github_url: githubUrl,
        demo_url: demoUrl,
        tech_stack: splitLinesOrComma(String(data.get("tech_stack") ?? "")),
        features: splitLines(String(data.get("features") ?? "")),
        attachment_id: attachmentId,
        attachment_name: attachmentName,
        created_at: editingProject?.created_at ?? new Date().toISOString()
      };
      const nextProjects = editingProject
        ? projects.map((item) => item.id === editingProject.id ? project : item)
        : [project, ...projects];
      localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(nextProjects));
      projects = nextProjects;
      renderProjects();
      projectStatus.textContent = "Local mode: your projects are saved in this browser only and are not visible to visitors.";
      closeProjectForm();
      return;
    }

    let attachmentPath = editingProject?.attachment_path ?? null;
    let attachmentName = editingProject?.attachment_name ?? null;
    if (attachment.size > 0) {
      const fileName = safeFileName(attachment.name);
      uploadedPath = `${crypto.randomUUID()}/${fileName}`;
      const { error: uploadError } = await client.storage.from(STORAGE_BUCKET).upload(uploadedPath, attachment, {
        contentType: attachment.type || "application/octet-stream",
        upsert: false
      });
      if (uploadError) throw uploadError;
      attachmentPath = uploadedPath;
      attachmentName = attachment.name;
    }

    const project = {
      title,
      description,
      category: data.get("category"),
      date: data.get("date") || null,
      link: link || null,
      github_url: githubUrl || null,
      demo_url: demoUrl || null,
      tech_stack: splitLinesOrComma(String(data.get("tech_stack") ?? "")),
      features: splitLines(String(data.get("features") ?? "")),
      attachment_path: attachmentPath,
      attachment_name: attachmentName
    };
    const result = editingProject
      ? await client.from("portfolio_projects").update(project).eq("id", editingProject.id)
      : await client.from("portfolio_projects").insert(project);
    if (result.error) throw result.error;

    const previousAttachment = editingProject?.attachment_path;
    closeProjectForm();
    if (uploadedPath && previousAttachment) {
      const { error: removeError } = await client.storage.from(STORAGE_BUCKET).remove([previousAttachment]);
      if (removeError) projectStatus.textContent = `Project was saved, but its previous attachment could not be deleted: ${removeError.message}`;
    }
    try {
      await loadProjects();
    } catch (error) {
      projectStatus.textContent = `Project was saved, but the project list could not be refreshed: ${error.message}`;
    }
  } catch (error) {
    if (uploadedPath) {
      const { error: removeError } = await client.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
      if (removeError) console.error("Could not clean up an unsaved project attachment.", removeError);
    }
    showMessage(`Project could not be saved: ${error.message}`);
  } finally {
    projectFormSubmit.disabled = false;
    projectFormSubmit.innerHTML = editingProject ? 'Update project <span aria-hidden="true">↗</span>' : 'Save project <span aria-hidden="true">↗</span>';
  }
}

function renderProjects() {
  projectGrid.replaceChildren();
  emptyState.hidden = projects.length > 0;
  projectGrid.hidden = projects.length === 0;
  for (const project of projects) projectGrid.append(createProjectCard(project));
}

function renderProfileLinks() {
  const socialLinks = document.querySelector("#social-links");
  if (!socialLinks) return;
  socialLinks.replaceChildren();
  const links = [
    ["GitHub", profile.github_url],
    ["LinkedIn", profile.linkedin_url],
    ["More", profile.other_url]
  ];
  for (const [label, value] of links) {
    let url;
    try {
      url = normalizeWebUrl(value || "");
    } catch {
      continue;
    }
    if (!url) continue;
    url = normalizeSocialUrl(label, url);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.className = "social-link";
    anchor.textContent = `${label} →`;
    socialLinks.append(anchor);
  }
  const emailLink = document.querySelector("#email-link");
  const emptyEmail = document.querySelector("#contact-email-empty");
  if (profile.contact_email) {
    emailLink.href = `mailto:${profile.contact_email}`;
    emailLink.textContent = "Email me ↗";
    emailLink.hidden = false;
    emptyEmail.hidden = true;
  } else {
    emailLink.href = "#";
    emailLink.hidden = true;
    emptyEmail.hidden = false;
  }
}

function normalizeSocialUrl(label, value) {
  const url = new URL(value);
  if (label === "GitHub" && url.hostname.endsWith(".github.com") && url.hostname !== "github.com" && !url.pathname.replaceAll("/", "")) {
    const username = url.hostname.slice(0, -".github.com".length);
    url.hostname = "github.com";
    url.pathname = `/${username}`;
  }
  return url.href;
}

function createTag(value) {
  const tag = document.createElement("span");
  tag.className = "skill-tag";
  tag.textContent = value;
  return tag;
}

async function loadEntries() {
  const { data, error } = await client
    .from("portfolio_entries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  entries = data ?? [];
  renderEntries();
}

function renderEntries() {
  const skillGrid = document.querySelector("#skills-grid");
  const credentialsList = document.querySelector("#credentials-list");
  const experienceList = document.querySelector("#experience-list");
  skillGrid.replaceChildren();
  credentialsList.replaceChildren();
  experienceList.replaceChildren();
  const skills = entries.filter((entry) => entry.type === "skill");
  const credentials = entries.filter((entry) => entry.type === "credential");
  const experiences = entries.filter((entry) => entry.type === "experience");
  document.querySelector("#skills-empty").hidden = skills.length > 0;
  document.querySelector("#credentials-empty").hidden = credentials.length > 0;
  document.querySelector("#experience-empty").hidden = experiences.length > 0;

  const byCategory = new Map();
  for (const skill of skills) {
    const category = skill.category || "Skills";
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(skill);
  }
  for (const [category, items] of byCategory) {
    const card = document.createElement("article");
    card.className = "skill-card";
    const heading = document.createElement("h3");
    heading.textContent = category;
    const tags = document.createElement("div");
    tags.className = "tag-list";
    for (const item of items) {
      for (const value of splitLinesOrComma(item.title || "")) tags.append(createTag(value));
      if (signedIn) tags.append(createEntryControls(item));
    }
    card.append(heading, tags);
    skillGrid.append(card);
  }
  for (const entry of credentials) credentialsList.append(createRecordCard(entry, "credential"));
  for (const entry of experiences) experienceList.append(createRecordCard(entry, "experience"));
}

function createEntryControls(entry) {
  const controls = document.createElement("span");
  controls.className = "entry-controls";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "Edit";
  edit.addEventListener("click", () => openEntryDialog(entry.type, entry));
  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => removeEntry(entry));
  controls.append(edit, remove);
  return controls;
}

function createRecordCard(entry, type) {
  const card = document.createElement("article");
  card.className = type === "experience" ? "experience-card" : "credential-card";
  const heading = document.createElement("div");
  heading.className = "record-heading";
  const title = document.createElement("h3");
  title.textContent = entry.title;
  const date = document.createElement("span");
  date.className = "project-date";
  date.textContent = entry.date || "";
  heading.append(title, date);
  const organization = document.createElement("p");
  organization.className = "record-organization";
  organization.textContent = [entry.organization, entry.category].filter(Boolean).join(" · ");
  card.append(heading);
  if (organization.textContent) card.append(organization);
  if (entry.description) {
    const description = document.createElement("ul");
    description.className = "record-description";
    for (const line of splitLines(entry.description)) {
      const item = document.createElement("li");
      item.textContent = line;
      description.append(item);
    }
    card.append(description);
  }
  if (entry.link && isSafeLink(entry.link)) {
    const link = document.createElement("a");
    link.className = "record-link";
    link.href = entry.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View details ↗";
    card.append(link);
  }
  if (signedIn) card.append(createEntryControls(entry));
  return card;
}

function entryField(labelText, name, options = {}) {
  const label = document.createElement("label");
  label.className = `field${options.wide ? " field-wide" : ""}`;
  label.textContent = labelText;
  const control = options.multiline ? document.createElement("textarea") : document.createElement("input");
  control.name = name;
  control.maxLength = options.maxLength || 500;
  if (options.multiline) control.rows = options.rows || 4;
  if (options.type) control.type = options.type;
  if (options.required) control.required = true;
  if (options.placeholder) control.placeholder = options.placeholder;
  label.append(control);
  return label;
}

function openEntryDialog(type, entry = null) {
  if (!signedIn) return;
  activeEntryType = type;
  editingEntry = entry;
  entryFields.replaceChildren();
  entryMessage.textContent = "";
  const title = type === "skill" ? "Skills" : type === "credential" ? "Qualification or certification" : "Experience";
  document.querySelector("#entry-dialog-eyebrow").textContent = `${type.toUpperCase()} · ${editingEntry ? "EDIT" : "ADD"}`;
  document.querySelector("#entry-dialog-title").textContent = `${editingEntry ? "Edit" : "Add"} ${title.toLowerCase()}`;
  const schema = type === "skill"
    ? [
        ["Category", "category", { required: true, placeholder: "Languages, Frameworks & Tools, Core Competencies..." }],
        ["Skills", "title", { required: true, wide: true, placeholder: "Comma-separated, e.g. Python, SQL, Git" }]
      ]
    : type === "credential"
      ? [
          ["Title", "title", { required: true }],
          ["Organization", "organization", {}],
          ["Date or status", "date", { placeholder: "e.g. 2026 or In progress" }],
          ["Description", "description", { multiline: true, wide: true, placeholder: "What did you achieve or learn?" }],
          ["Certificate link", "link", { type: "url", wide: true, placeholder: "https://" }]
        ]
      : [
          ["Role or project", "title", { required: true }],
          ["Organization", "organization", {}],
          ["Dates", "date", { placeholder: "e.g. 2025–2026" }],
          ["What you contributed", "description", { multiline: true, wide: true, placeholder: "One contribution per line; start with an action verb." }],
          ["Related link", "link", { type: "url", wide: true, placeholder: "https://" }]
        ];
  for (const [label, name, options] of schema) {
    const field = entryField(label, name, options);
    const control = field.querySelector("input, textarea");
    if (entry) control.value = entry[name] || "";
    entryFields.append(field);
  }
  entryDialog.showModal();
}

async function saveEntry(event) {
  event.preventDefault();
  const data = new FormData(entryForm);
  const entry = Object.fromEntries(["category", "title", "organization", "date", "description", "link"]
    .map((key) => [key, String(data.get(key) ?? "").trim()]));
  if (entry.link && !isSafeLink(entry.link)) {
    entryMessage.textContent = "Enter a complete link that starts with https:// or http://.";
    return;
  }
  const saveButton = document.querySelector("#save-entry");
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  try {
    if (localMode) {
      const saved = { ...entry, id: editingEntry?.id || createId(), type: activeEntryType };
      entries = editingEntry ? entries.map((item) => item.id === editingEntry.id ? saved : item) : [saved, ...entries];
      localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries));
    } else {
      const query = client.from("portfolio_entries");
      const result = editingEntry
        ? await query.update(entry).eq("id", editingEntry.id)
        : await query.insert({ ...entry, type: activeEntryType });
      if (result.error) throw result.error;
      await loadEntries();
    }
    renderEntries();
    entryDialog.close();
  } catch (error) {
    entryMessage.textContent = `Entry could not be saved: ${error.message}`;
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = 'Save entry <span aria-hidden="true">↗</span>';
  }
}

async function removeEntry(entry) {
  if (!window.confirm(`Remove "${entry.title}" from your portfolio?`)) return;
  try {
    if (localMode) {
      entries = entries.filter((item) => item.id !== entry.id);
      localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries));
      renderEntries();
      return;
    }
    const { error } = await client.from("portfolio_entries").delete().eq("id", entry.id);
    if (error) throw error;
    await loadEntries();
  } catch (error) {
    projectStatus.textContent = `Portfolio entry could not be removed: ${error.message}`;
  }
}

function createProjectCard(project) {
  const card = document.createElement("article");
  card.className = "project-card";
  const topline = document.createElement("div");
  topline.className = "project-topline";
  const category = document.createElement("span");
  category.className = "project-category";
  category.textContent = project.category || "Project";
  topline.append(category);
  if (project.date) {
    const date = document.createElement("time");
    date.className = "project-date";
    date.dateTime = project.date;
    date.textContent = formatMonth(project.date);
    topline.append(date);
  }

  const title = document.createElement("h3");
  title.textContent = project.title;
  const description = document.createElement("p");
  description.className = "project-description";
  description.textContent = project.description;
  const tags = document.createElement("div");
  tags.className = "tag-list";
  for (const tag of project.tech_stack || []) tags.append(createTag(tag));
  const features = document.createElement("ul");
  features.className = "project-features";
  for (const feature of project.features || []) {
    const item = document.createElement("li");
    item.textContent = feature;
    features.append(item);
  }
  const actions = document.createElement("div");
  actions.className = "project-actions";
  for (const [url, label] of [
    [project.github_url || project.link, "GitHub / Repository ↗"],
    [project.demo_url, "Live demo ↗"]
  ]) {
    if (!url || !isSafeLink(url)) continue;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    actions.append(link);
  }
  if (localMode && project.attachment_id && project.attachment_name) {
    const attachment = document.createElement("a");
    attachment.href = "#";
    attachment.textContent = `Download ${project.attachment_name}`;
    attachment.addEventListener("click", (event) => downloadLocalAttachment(event, project));
    actions.append(attachment);
  }
  if (project.attachment_path && project.attachment_name) {
    const attachment = document.createElement("a");
    const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(project.attachment_path);
    attachment.href = data.publicUrl;
    attachment.target = "_blank";
    attachment.rel = "noopener noreferrer";
    attachment.textContent = `View ${project.attachment_name} ↗`;
    actions.append(attachment);
  }
  if (signedIn) {
    const edit = document.createElement("button");
    edit.className = "project-edit";
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openProjectForm(project));
    actions.append(edit);
    const remove = document.createElement("button");
    remove.className = "project-delete";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${project.title}`);
    remove.addEventListener("click", () => removeProject(project));
    actions.append(remove);
  }
  card.append(topline, title, description);
  if (tags.childElementCount) card.append(tags);
  if (features.childElementCount) card.append(features);
  card.append(actions);
  return card;
}

function formatMonth(value) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month || month > 12) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
}

async function removeProject(project) {
  if (!window.confirm(`Remove "${project.title}" from your public portfolio?`)) return;
  if (localMode) {
    try {
      const nextProjects = projects.filter((item) => item.id !== project.id);
      localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(nextProjects));
      projects = nextProjects;
      renderProjects();
      projectStatus.textContent = "Local mode: your projects are saved in this browser only and are not visible to visitors.";
      if (project.attachment_id) await deleteLocalAttachment(project.attachment_id);
    } catch (error) {
      projectStatus.textContent = `Project could not be removed: ${error.message}`;
    }
    return;
  }
  try {
    const { error } = await client.from("portfolio_projects").delete().eq("id", project.id);
    if (error) throw error;
  } catch (error) {
    projectStatus.textContent = `Project could not be removed: ${error.message}`;
    return;
  }
  projects = projects.filter((item) => item.id !== project.id);
  renderProjects();
  projectStatus.textContent = projects.length
    ? "Projects are shared with every visitor."
    : "No projects have been published yet.";
  let attachmentError = "";
  if (project.attachment_path) {
    const { error } = await client.storage.from(STORAGE_BUCKET).remove([project.attachment_path]);
    if (error) attachmentError = error.message;
  }
  try {
    await loadProjects();
    if (attachmentError) {
      projectStatus.textContent = `Project was removed, but its attachment could not be deleted: ${attachmentError}`;
    }
  } catch (error) {
    projectStatus.textContent = `Project was removed, but the project list could not be refreshed: ${error.message}`;
  }
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function openLocalDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LOCAL_ATTACHMENTS)) {
        request.result.createObjectStore(LOCAL_ATTACHMENTS);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local file storage."));
  });
}

async function storeLocalAttachment(id, file) {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LOCAL_ATTACHMENTS, "readwrite");
    transaction.objectStore(LOCAL_ATTACHMENTS).put(file, id);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Could not save the file in this browser.")); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Saving the file was cancelled.")); };
  });
}

async function downloadLocalAttachment(event, project) {
  event.preventDefault();
  try {
    const database = await openLocalDatabase();
    const file = await new Promise((resolve, reject) => {
      const transaction = database.transaction(LOCAL_ATTACHMENTS, "readonly");
      const request = transaction.objectStore(LOCAL_ATTACHMENTS).get(project.attachment_id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not load the saved file."));
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => database.close();
    });
    if (!file) throw new Error("The file is no longer available in this browser.");
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = project.attachment_name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    projectStatus.textContent = `Attachment could not be downloaded: ${error.message}`;
  }
}

async function deleteLocalAttachment(id) {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LOCAL_ATTACHMENTS, "readwrite");
    transaction.objectStore(LOCAL_ATTACHMENTS).delete(id);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Could not remove the saved file.")); };
  });
}
