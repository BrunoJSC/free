import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";

import { Container } from "@/components/container";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { trpc } from "@/utils/trpc";

type Theme = typeof NAV_THEME.light;

interface Todo {
	completed: boolean;
	id: number;
	text: string;
}

interface TodoItemProps {
	onDelete: (id: number) => void;
	onToggle: (id: number, completed: boolean) => void;
	theme: Theme;
	todo: Todo;
}

function TodoItem({
	todo,
	theme,
	onToggle,
	onDelete,
}: Readonly<TodoItemProps>) {
	const handleToggle = useCallback(() => {
		onToggle(todo.id, todo.completed);
	}, [onToggle, todo.id, todo.completed]);

	const handleDelete = useCallback(() => {
		onDelete(todo.id);
	}, [onDelete, todo.id]);

	return (
		<View
			style={[
				styles.todoCard,
				{ backgroundColor: theme.card, borderColor: theme.border },
			]}
		>
			<View style={styles.todoRow}>
				<TouchableOpacity
					onPress={handleToggle}
					style={[styles.checkbox, { borderColor: theme.border }]}
				>
					{todo.completed ? (
						<Ionicons color={theme.primary} name="checkmark" size={16} />
					) : null}
				</TouchableOpacity>
				<View style={styles.todoTextContainer}>
					<Text
						style={[
							styles.todoText,
							{ color: theme.text },
							todo.completed && {
								opacity: 0.5,
								textDecorationLine: "line-through",
							},
						]}
					>
						{todo.text}
					</Text>
				</View>
				<TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
					<Ionicons color={theme.notification} name="trash-outline" size={24} />
				</TouchableOpacity>
			</View>
		</View>
	);
}

export default function TodosScreen() {
	const { colorScheme } = useColorScheme();
	const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;
	const [newTodoText, setNewTodoText] = useState("");

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

	const handleAddTodo = useCallback(() => {
		if (newTodoText.trim()) {
			createMutation.mutate({ text: newTodoText });
		}
	}, [createMutation, newTodoText]);

	const handleToggleTodo = useCallback(
		(id: number, completed: boolean) => {
			toggleMutation.mutate({ completed: !completed, id });
		},
		[toggleMutation]
	);

	const handleDeleteTodo = useCallback(
		(id: number) => {
			Alert.alert("Delete Todo", "Are you sure you want to delete this todo?", [
				{ style: "cancel", text: "Cancel" },
				{
					onPress: () => deleteMutation.mutate({ id }),
					style: "destructive",
					text: "Delete",
				},
			]);
		},
		[deleteMutation]
	);

	const isLoading = todos?.isLoading;
	const completedCount = todos?.data?.filter((t) => t.completed).length || 0;
	const totalCount = todos?.data?.length || 0;

	return (
		<Container>
			<ScrollView
				contentContainerStyle={styles.contentContainer}
				style={styles.scrollView}
			>
				<View style={styles.header}>
					<View style={styles.headerRow}>
						<Text style={[styles.title, { color: theme.text }]}>Todo List</Text>
						{totalCount > 0 && (
							<View style={[styles.badge, { backgroundColor: theme.primary }]}>
								<Text style={styles.badgeText}>
									{completedCount}/{totalCount}
								</Text>
							</View>
						)}
					</View>
				</View>
				<View
					style={[
						styles.inputCard,
						{ backgroundColor: theme.card, borderColor: theme.border },
					]}
				>
					<View style={styles.inputRow}>
						<View style={styles.inputContainer}>
							<TextInput
								editable={!createMutation.isPending}
								onChangeText={setNewTodoText}
								onSubmitEditing={handleAddTodo}
								placeholder="Add a new task..."
								placeholderTextColor={theme.text}
								returnKeyType="done"
								style={[
									styles.input,
									{
										backgroundColor: theme.background,
										borderColor: theme.border,
										color: theme.text,
									},
								]}
								value={newTodoText}
							/>
						</View>
						<TouchableOpacity
							disabled={createMutation.isPending || !newTodoText.trim()}
							onPress={handleAddTodo}
							style={[
								styles.addButton,
								{
									backgroundColor:
										createMutation.isPending || !newTodoText.trim()
											? theme.border
											: theme.primary,
									opacity:
										createMutation.isPending || !newTodoText.trim() ? 0.5 : 1,
								},
							]}
						>
							{createMutation.isPending ? (
								<ActivityIndicator color="#ffffff" size="small" />
							) : (
								<Ionicons color="#ffffff" name="add" size={24} />
							)}
						</TouchableOpacity>
					</View>
				</View>

				{isLoading ? (
					<View style={styles.centerContainer}>
						<ActivityIndicator color={theme.primary} size="large" />
						<Text
							style={[styles.loadingText, { color: theme.text, opacity: 0.7 }]}
						>
							Loading todos...
						</Text>
					</View>
				) : null}

				{todos?.data && todos.data.length === 0 && !isLoading && (
					<View
						style={[
							styles.emptyCard,
							{ backgroundColor: theme.card, borderColor: theme.border },
						]}
					>
						<Ionicons
							color={theme.text}
							name="checkbox-outline"
							size={64}
							style={{ marginBottom: 16, opacity: 0.5 }}
						/>
						<Text style={[styles.emptyTitle, { color: theme.text }]}>
							No todos yet
						</Text>
						<Text
							style={[styles.emptyText, { color: theme.text, opacity: 0.7 }]}
						>
							Add your first task to get started!
						</Text>
					</View>
				)}

				{todos?.data && todos.data.length > 0 && (
					<View style={styles.todosList}>
						{todos.data.map((todo) => (
							<TodoItem
								key={todo.id}
								onDelete={handleDeleteTodo}
								onToggle={handleToggleTodo}
								theme={theme}
								todo={todo}
							/>
						))}
					</View>
				)}
			</ScrollView>
		</Container>
	);
}

const styles = StyleSheet.create({
	addButton: {
		alignItems: "center",
		height: 48,
		justifyContent: "center",
		width: 48,
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	badgeText: {
		color: "#ffffff",
		fontSize: 12,
	},
	centerContainer: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 32,
	},
	checkbox: {
		alignItems: "center",
		borderWidth: 2,
		height: 24,
		justifyContent: "center",
		width: 24,
	},
	contentContainer: {
		padding: 16,
	},
	deleteButton: {
		padding: 4,
	},
	emptyCard: {
		alignItems: "center",
		borderWidth: 1,
		justifyContent: "center",
		padding: 32,
	},
	emptyText: {
		fontSize: 14,
		textAlign: "center",
	},
	emptyTitle: {
		fontSize: 16,
		fontWeight: "bold",
		marginBottom: 8,
	},
	header: {
		marginBottom: 16,
	},
	headerRow: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
	},
	input: {
		borderWidth: 1,
		fontSize: 16,
		padding: 12,
	},
	inputCard: {
		borderWidth: 1,
		marginBottom: 16,
		padding: 12,
	},
	inputContainer: {
		flex: 1,
	},
	inputRow: {
		alignItems: "center",
		flexDirection: "row",
		gap: 8,
	},
	loadingText: {
		fontSize: 14,
		marginTop: 16,
	},
	scrollView: {
		flex: 1,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
	},
	todoCard: {
		borderWidth: 1,
		padding: 12,
	},
	todoRow: {
		alignItems: "center",
		flexDirection: "row",
		gap: 12,
	},
	todosList: {
		gap: 8,
	},
	todoText: {
		fontSize: 16,
	},
	todoTextContainer: {
		flex: 1,
	},
});
