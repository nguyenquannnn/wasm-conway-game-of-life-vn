mod utils;
use std::fmt;

use wasm_bindgen::prelude::*;

extern crate fixedbitset;
extern crate web_sys;
extern crate js_sys;

use fixedbitset::FixedBitSet;
// A macro to provide `println!(..)`-style syntax for `console.log` logging.

#[allow(unused_macros)]
macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cell {
    Dead = 0,
    Alive = 1,
}

// impl Cell {
//     fn toggle(&mut self) {
//         *self =  match *self {
//             Cell::Dead => Cell::Alive,
//             Cell::Alive => Cell::Dead
//         }
//     }
// }

#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    cells: FixedBitSet,
}

impl fmt::Display for Universe {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        for line in self.cells.as_slice().chunks(self.width as usize) {
            for &cell in line {
                let symbol = if cell == 0 { '◻' } else { '◼' };
                write!(f, "{}", symbol)?;
            }
            write!(f, "\n")?;
        }

        Ok(())
    }
}

#[wasm_bindgen]
impl Universe {
    pub fn new(width: u32, height: u32) -> Universe {
        utils::set_panic_hook();
        let size = (width * height) as usize;
        let mut cells = FixedBitSet::with_capacity(size);
        for i in 1..size {
            cells.set(i, i % 2 == 0 || i % 7 == 0);
        }
        Universe {
            width,
            height,
            cells,
        }
    }

    pub fn randomize(width: u32, height: u32) -> Universe {
        utils::set_panic_hook();
        let size = (width * height) as usize;
        let mut cells = FixedBitSet::with_capacity(size);
        
        for i in 1..size {
            cells.set(i, if js_sys::Math::random() < 0.5 { true } else {false});            
        }

        Universe {
            width, height, cells
        }
    }

    fn get_index(&self, row: u32, col: u32) -> usize {
        (row * self.width + col) as usize
    }

    fn count_live_neighbour(&self, row: u32, col: u32) -> u8 {
        let mut count = 0;
        for delta_row in [0, 1, self.height - 1].iter().cloned() {
            for delta_col in [0, 1, self.width - 1].iter().cloned() {
                if delta_row == 0 && delta_col == 0 {
                    continue;
                }

                let neighbour_row = (row + delta_row) % self.height;
                let neighbour_col = (col + delta_col) % self.width;
                let neighbour_idx = self.get_index(neighbour_row, neighbour_col);
                count += self.cells[neighbour_idx] as u8;
            }
        }
        count
    }

    pub fn tick(&mut self) {
        let mut next_gen = self.cells.clone();
        for row in 0..self.height {
            for col in 0..self.width {
                let idx = self.get_index(row, col);
                let cell = self.cells[idx];
                let live_neighbours = self.count_live_neighbour(row, col);

                let next_cell = match (cell, live_neighbours) {
                    (true, live_count) if live_count < 2 => false,
                    (true, live_count) if live_count == 2 || live_count == 3 => true,
                    (true, live_count) if live_count > 3 => false,
                    (false, 3) => true,
                    (otherwise, _) => otherwise,
                };
                next_gen.set(idx, next_cell);
            }
        }
        self.cells = next_gen;
    }

    pub fn toggle_cell(&mut self, row: u32, column: u32) {
        let idx = (row * self.width + column) as usize;
        self.cells.set(idx, !self.cells[idx]);
    }

    pub fn render(&self) -> String {
        self.to_string()
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn cells(&self) -> *const u32 {
        self.cells.as_slice().as_ptr()
    }

    pub fn clear(&mut self) {
        let size = (self.width * self.height) as usize;
        self.cells = FixedBitSet::with_capacity(size);
        for i in 0..size {
            self.cells.set(i, false);
        }
    }
}

// impl std::fmt::Display for Universe {
//     fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
//         for line in self.cells.as_slice().chunks(self.width as usize) {
//             for &cell in line {
//                 let symbol = if cell == Cell::Dead { '◻' } else { '◼' };
//                 write!(f, "{}", symbol)?;
//             }
//             writeln!(f)?;
//         }
//         Ok(())
//     }
// }

#[wasm_bindgen]
pub fn greet(msg: &str) {
    alert(msg);
}
