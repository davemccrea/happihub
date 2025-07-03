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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 ml-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </.link>
          </div>
        </div>
      </div>
    </Layouts.app>
    """
  end
end
