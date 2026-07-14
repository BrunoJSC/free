import { Button } from "@free/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@free/ui/components/card";
import { Checkbox } from "@free/ui/components/checkbox";
import { Input } from "@free/ui/components/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";
import {
	type ChangeEvent,
	type FormEvent,
	type ReactNode,
	useCallback,
	useState,
} from "react";

import { useTRPC } from "@/utils/trpc";

type TodoId = number;

interface Todo {
	completed: boolean;
	id: TodoId;
	text: string;
}

interface TodoItemProps {
	onDelete: (id: TodoId) => void;
	onToggle: (id: TodoId, completed: boolean) => void;
	todo: Todo;
}

function TodoItem({ todo, onToggle, onDelete }: Readonly<TodoItemProps>) {
	const handleToggle = useCallback(() => {
		onToggle(todo.id, todo.completed);
	}, [onToggle, todo.id, todo.completed]);

	const handleDelete = useCallback(() => {
		onDelete(todo.id);
	}, [onDelete, todo.id]);

	return (
		<li className="flex items-center justify-between rounded-md border p-2">
			<div className="flex items-center space-x-2">
				<Checkbox
					checked={todo.completed}
					id={`todo-${todo.id}`}
					onCheckedChange={handleToggle}
				/>
				<label
					className={todo.completed ? "line-through" : undefined}
					htmlFor={`todo-${todo.id}`}
				>
					{todo.text}
				</label>
			</div>
			<Button
				aria-label="Delete todo"
				onClick={handleDelete}
				size="icon"
				variant="ghost"
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		</li>
	);
}

export const Route = createFileRoute("/todos")({
	component: TodosRoute,
});

function TodosRoute() {
	const [newTodoText, setNewTodoText] = useState("");

	const trpc = useTRPC();

	const todos = useQuery(trpc.todo.getAll.queryOptions());
	const createMutation = useMutation(
		trpc.todo.create.mutationOptions({
			onSuccess: () => {
				todos.refetch();
				setNewTodoText("");
			},
		})
	);
	const toggleMutation = useMutation(
		trpc.todo.toggle.mutationOptions({
			onSuccess: () => {
				todos.refetch();
			},
		})
	);
	const deleteMutation = useMutation(
		trpc.todo.delete.mutationOptions({
			onSuccess: () => {
				todos.refetch();
			},
		})
	);

	const handleAddTodo = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (newTodoText.trim()) {
				createMutation.mutate({ text: newTodoText });
			}
		},
		[createMutation, newTodoText]
	);

	const handleTextChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
		setNewTodoText(e.target.value);
	}, []);

	const handleToggleTodo = useCallback(
		(id: TodoId, completed: boolean) => {
			toggleMutation.mutate({ completed: !completed, id });
		},
		[toggleMutation]
	);

	const handleDeleteTodo = useCallback(
		(id: TodoId) => {
			deleteMutation.mutate({ id });
		},
		[deleteMutation]
	);

	let content: ReactNode;
	if (todos.isLoading) {
		content = (
			<div className="flex justify-center py-4">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	} else if (todos.data?.length === 0) {
		content = <p className="py-4 text-center">No todos yet. Add one above!</p>;
	} else {
		content = (
			<ul className="space-y-2">
				{todos.data?.map((todo) => (
					<TodoItem
						key={todo.id}
						onDelete={handleDeleteTodo}
						onToggle={handleToggleTodo}
						todo={todo}
					/>
				))}
			</ul>
		);
	}

	return (
		<div className="mx-auto w-full max-w-md py-10">
			<Card>
				<CardHeader>
					<CardTitle>Todo List</CardTitle>
					<CardDescription>Manage your tasks efficiently</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						className="mb-6 flex items-center space-x-2"
						onSubmit={handleAddTodo}
					>
						<Input
							disabled={createMutation.isPending}
							onChange={handleTextChange}
							placeholder="Add a new task..."
							value={newTodoText}
						/>
						<Button
							disabled={createMutation.isPending || !newTodoText.trim()}
							type="submit"
						>
							{createMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								"Add"
							)}
						</Button>
					</form>

					{content}
				</CardContent>
			</Card>
		</div>
	);
}
