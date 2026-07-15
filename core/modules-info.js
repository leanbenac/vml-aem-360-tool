// =======================================================
// AEM 360 Tool — In-App Documentation Dictionary
// Centralized rules, descriptions, and validations (English)
// =======================================================

const MODULES_DOCUMENTATION = {
  assetInjector: {
    title: "Asset Injector",
    description: "Inject files and folders with assets directly into AEM instances.",
    validations: [
      "Select assets from your local system.",
      "Automatically map files to the correct AEM JCR paths.",
      "Push assets directly into the AEM repository."
    ]
  },
  colorizerCreator: {
    title: "Colorizer JSON Creator",
    description: "Generate AEM component JSON configs by managing models, VDM sales codes, colors, wheels, and assets.",
    validations: [
      "Define vehicle models and NASAPI model IDs.",
      "Manage exterior colors, wheels, and interior configurations.",
      "Import existing configurations to edit them or add new colors.",
      "Export generated JSON configurations instantly."
    ]
  }
};
