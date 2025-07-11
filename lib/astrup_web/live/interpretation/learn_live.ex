defmodule AstrupWeb.Interpretation.LearnLive do
  @moduledoc """
  Learning page for Blood Gas Interpretation concepts and methodology.
  """
  use AstrupWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div class="mb-8">
          <h1 class="text-2xl sm:text-3xl font-bold mb-4">
            {gettext("Interpretation")}
          </h1>
          <p class="text-base-content/70 mb-6">
            {gettext(
              "This learning section is under development. Take the quiz to practice interpretation skills!"
            )}
          </p>
          
    <!-- Navigation to Quiz -->
          <div class="mb-8">
            <.link navigate={~p"/interpretation/quiz"} class="btn btn-primary">
              {gettext("Take Quiz")}
              <.icon name="hero-arrow-right" class="w-5 h-5" />
            </.link>
          </div>
        </div>
      </div>
    </Layouts.app>
    """
  end
end
