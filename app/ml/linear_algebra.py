"""Gauss-Jordan solver used by the ridge regressor's normal equations."""

from typing import List


def solve_linear_system(matrix: List[List[float]], vector: List[float]) -> List[float]:
    """Solve ``matrix . x = vector`` with partial pivoting."""
    size = len(vector)
    augmented = [row[:] + [vector[index]] for index, row in enumerate(matrix)]

    for pivot_index in range(size):
        # Partial pivoting: move the largest remaining coefficient onto the
        # diagonal to keep the elimination numerically stable.
        pivot_row = max(range(pivot_index, size), key=lambda row: abs(augmented[row][pivot_index]))
        augmented[pivot_index], augmented[pivot_row] = augmented[pivot_row], augmented[pivot_index]

        pivot = augmented[pivot_index][pivot_index]
        if abs(pivot) < 1e-10:
            raise ValueError("Model training failed because the feature matrix is singular.")

        scale = 1.0 / pivot
        augmented[pivot_index] = [value * scale for value in augmented[pivot_index]]

        for row_index in range(size):
            if row_index == pivot_index:
                continue
            factor = augmented[row_index][pivot_index]
            augmented[row_index] = [
                left - factor * right
                for left, right in zip(augmented[row_index], augmented[pivot_index])
            ]

    return [row[-1] for row in augmented]
