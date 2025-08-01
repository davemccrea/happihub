# Elixir and Phoenix Best Practices

## Core Principles

- **Domain-Driven Design**: Organize code around business domains, not technical layers
- **Functional Core, Imperative Shell**: Pure domain logic with side effects at boundaries
- **Explicit Over Implicit**: Prefer clarity over magic
- **Composition Over Inheritance**: Build systems from small, focused components
- **Single Responsibility**: Each module and function should do one thing well
- **Easy to Change**: Design for maintainability and future change
- **Fail Fast**: Detect and handle errors as early as possible
- **YAGNI**: Don't build features until they're needed

## Project Structure

- **Context-Based Organization**: Use Phoenix contexts to define domain boundaries

  ```
  lib/my_app/
    accounts/     # User management domain
    billing/      # Payment processing domain
    catalog/      # Product catalog domain
  ```

- **API/Implementation Separation**: Public API modules delegate to implementation modules

  ```elixir
  # In MyApp.Accounts (API module)
  defdelegate create_user(attrs), to: MyApp.Accounts.UserCreator
  ```

- **Boundary Enforcement**: Use tools like NimbleOptions to validate inputs at boundaries

## Coding Patterns

- **Pattern Matching**: Use pattern matching in function heads for control flow
- **Railway-Oriented Programming**: Chain operations with `with` for elegant error handling

  ```elixir
  with {:ok, user} <- find_user(id),
       {:ok, updated} <- update_user(user, attrs) do
    {:ok, updated}
  end
  ```

- **Type Specifications**: Add typespecs to all public functions

  ```elixir
  @spec create_user(user_attrs()) :: {:ok, User.t()} | {:error, Changeset.t()}
  ```

- **Immutable Data Transformations**: Return new state rather than modifying existing state

- **Data Validation**: Validate data at boundaries using Ecto.Changeset even outside of database contexts

  ```elixir
  def validate_attrs(attrs) do
    {%{}, %{name: :string, email: :string}}
    |> Ecto.Changeset.cast(attrs, [:name, :email])
    |> Ecto.Changeset.validate_required([:name, :email])
    |> Ecto.Changeset.validate_format(:email, ~r/@/)
  end
  ```

- **Result Tuples**: Return tagged tuples like `{:ok, result}` or `{:error, reason}` for operations that can fail

## Process Design

- **GenServer for State**: Use GenServers for stateful processes
- **Supervision Trees**: Design proper supervision hierarchies
- **Registry Pattern**: Use Registry for dynamic process lookup
- **Task.Supervisor**: Use for concurrent, potentially failing operations
- **Process Isolation**: Design processes to crash independently without affecting the whole system
- **Let It Crash**: Embrace the "let it crash" philosophy with proper supervision

## Phoenix Best Practices

- **LiveView-First**: Use LiveView as the primary UI technology
- **Function Components**: Use function components for reusable UI elements
- **PubSub for Real-time**: Use Phoenix PubSub for real-time features
- **Context Boundaries**: Respect context boundaries in controllers and LiveViews
- **Thin Controllers**: Keep controllers thin, delegating business logic to contexts
- **Security First**: Always consider security implications (CSRF, XSS, etc.)

## Testing Strategies

- **Test Public APIs**: Focus on testing public context APIs
- **Mox for Dependencies**: Use Mox for mocking external dependencies
- **Property-Based Testing**: Use StreamData for property-based tests
- **Test Factories**: Use ExMachina for test data creation
- **Test Readability**: Write tests that serve as documentation
- **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification phases

## HTTP and API Integration

- **Req for HTTP Clients**: Use Req instead of HTTPoison or Tesla
- **Behaviours for API Clients**: Define behaviours for API clients to allow easy mocking
- **Error Handling**: Handle network failures and unexpected responses gracefully
- **Timeouts**: Always set appropriate timeouts for external calls
- **Circuit Breakers**: Use circuit breakers for critical external services

## Naming Conventions

- **Snake Case**: For variables and functions (`create_user`)
- **Verb-First Functions**: Start function names with verbs (`create_user`, not `user_create`)
- **Plural for Collections**: Use plural for collections (`users`, not `user`)
- **Consistent Terminology**: Use consistent terms throughout the codebase
- **Intention-Revealing Names**: Choose names that reveal intent, not implementation

## Documentation and Quality

- **Document Public Functions**: Add `@doc` to all public functions
- **Examples in Docs**: Include examples in documentation
- **Credo and Dialyzer**: Use for static analysis and type checking
- **Consistent Formatting**: Use `mix format` to maintain consistent code style
- **Continuous Refactoring**: Regularly improve code structure without changing behavior
- **Comments**: Write comments only when necessary. Describe why, not what it does.

## Performance Considerations

- **Avoid N+1 Queries**: Use Ecto's preloading and joins
- **Pagination**: Paginate large result sets
- **Background Jobs**: Use Oban for background processing
- **Measure First**: Profile before optimizing
- **Caching**: Apply strategic caching where appropriate
