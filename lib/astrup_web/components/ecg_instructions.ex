defmodule AstrupWeb.Components.EcgInstructions do
  use AstrupWeb, :html

  def default_instructions(assigns) do
    ~H"""
    <div class="text-sm text-base-content/60 flex items-center gap-2">
      <span>Use</span>
      <kbd class="kbd kbd-sm">↑</kbd>
      <kbd class="kbd kbd-sm">↓</kbd>
      <span>to switch leads,</span>
      <kbd class="kbd kbd-sm">Space</kbd>
      <span>to play/pause</span>
    </div>
    """
  end
end
