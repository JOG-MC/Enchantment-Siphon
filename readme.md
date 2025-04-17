# Enchantment Siphon Addon for Minecraft Bedrock

A Minecraft Bedrock Edition addon that introduces a new way to manage enchantments, allowing players to selectively save valuable enchantments from their items.

## Features

* **New Block:** Adds the "Enchantment Siphon" block to the game.
* **Crafting Recipe:** Provides a recipe to craft the Enchantment Siphon block using Obsidian, an Anvil, and an Enchanting Table [cite: recipes/enchantment_siphon_recipe.json].
* **Selective Disenchanting:** Interact with the Siphon block to open a UI.
* **Item Selection UI:** Choose which enchanted item from your inventory you want to modify.
* **Enchantment Selection UI:** Select the specific enchantment you wish to remove from the chosen item.
* **Resource Cost:** Requires Experience Levels (based on enchantment level, currently set to 1 level per enchantment level) and one regular (non-enchanted) Book to perform the siphoning.
* **Enchanted Book Creation:** Successfully siphoning an enchantment consumes the cost and creates a new Enchanted Book containing the removed enchantment.
* **Item Modification:** The selected enchantment is removed from the original item in your inventory.

## How to Use

1.  **Craft the Block:** Craft the Enchantment Siphon at a Crafting Table using the following recipe:
    ```
    ODO
    OEO
    OOO
    ```
    Where:
    * O = Obsidian
    * D = Anvil
    * E = Enchanting Table
2.  **Place the Block:** Place the Enchantment Siphon block in the world.
3.  **Interact:** Right-click the placed Enchantment Siphon block (you don't need to hold the item you want to modify).
4.  **Select Item:** A UI will appear listing enchanted items in your inventory. Select the one you want to use.
5.  **Select Enchantment:** A second UI will appear listing the enchantments on the chosen item, along with the XP cost. Select the enchantment you want to remove.
6.  **Siphon:** If you have enough XP levels and at least one regular Book in your inventory, the process will complete. The book and XP will be consumed, the enchantment removed from your item, and a new Enchanted Book added to your inventory.

## Installation

1.  Download the `.mcaddon` file from the [Releases page](link-to-your-releases-page) (You'll need to replace this link).
2.  Open the downloaded `.mcaddon` file. Minecraft should automatically open and import the addon.
3.  Create a new world or edit an existing world.
4.  Go to the "Behavior Packs" section and activate the "Enchantment Siphon BP".
5.  Go to the "Resource Packs" section and activate the "Enchantment Siphon RP".
6.  **IMPORTANT:** Enable the **"Beta APIs"** experimental toggle in the world settings under "Experiments".
7.  Load the world.