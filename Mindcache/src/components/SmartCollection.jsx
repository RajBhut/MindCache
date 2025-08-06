import { useState, useEffect } from "react";
import { format } from "date-fns";
import useStore from "../store/useStore";
import {
  Zap,
  Tag,
  Search,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Star,
  Filter,
  Archive,
} from "lucide-react";

const SmartCollection = () => {
  const { highlights, notes, quotes } = useStore();
  const [collections, setCollections] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);

  useEffect(() => {
    loadCollections();
    createSmartCollections();
  }, [highlights, notes, quotes]);

  const loadCollections = () => {
    const data = JSON.parse(
      localStorage.getItem("mindcache-collections") || "[]"
    );
    setCollections(data);
  };

  const saveCollections = (newCollections) => {
    localStorage.setItem(
      "mindcache-collections",
      JSON.stringify(newCollections)
    );
    setCollections(newCollections);
  };

  const createSmartCollections = () => {
    const allItems = [...highlights, ...notes, ...quotes];

    // Auto-create smart collections based on patterns
    const smartCollections = [
      {
        id: "recent",
        name: "Recent Activity",
        type: "smart",
        description: "Items from the last 7 days",
        icon: "⏰",
        filter: (items) => {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return items.filter(
            (item) => new Date(item.timestamp) > sevenDaysAgo
          );
        },
      },
      {
        id: "starred",
        name: "Important",
        type: "smart",
        description: "Items marked as important or with notes",
        icon: "⭐",
        filter: (items) =>
          items.filter(
            (item) =>
              item.note ||
              item.content?.includes("important") ||
              item.text?.includes("important")
          ),
      },
      {
        id: "long-content",
        name: "Detailed Content",
        type: "smart",
        description: "Longer highlights and comprehensive notes",
        icon: "📖",
        filter: (items) =>
          items.filter(
            (item) =>
              (item.text && item.text.length > 200) ||
              (item.content && item.content.length > 100)
          ),
      },
    ];

    // Get existing manual collections
    const existingCollections = collections.filter((c) => c.type !== "smart");

    // Combine with smart collections
    const allCollections = [...smartCollections, ...existingCollections];
    setCollections(allCollections);
  };

  const createCollection = (collectionData) => {
    const newCollection = {
      id: Date.now().toString(),
      ...collectionData,
      type: "manual",
      createdAt: new Date().toISOString(),
      items: [],
    };

    const updatedCollections = [
      ...collections.filter((c) => c.type === "smart"),
      newCollection,
    ];
    saveCollections(updatedCollections);
    setShowCreateModal(false);
  };

  const addToCollection = (collectionId, itemId, itemType) => {
    const updatedCollections = collections.map((collection) => {
      if (collection.id === collectionId) {
        const newItem = {
          id: itemId,
          type: itemType,
          addedAt: new Date().toISOString(),
        };
        return {
          ...collection,
          items: [...(collection.items || []), newItem],
        };
      }
      return collection;
    });
    saveCollections(updatedCollections);
  };

  const getCollectionItems = (collection) => {
    if (collection.type === "smart" && collection.filter) {
      const allItems = [
        ...highlights.map((item) => ({ ...item, itemType: "highlight" })),
        ...notes.map((item) => ({ ...item, itemType: "note" })),
        ...quotes.map((item) => ({ ...item, itemType: "quote" })),
      ];
      return collection.filter(allItems);
    }

    if (collection.items) {
      return collection.items
        .map((collectionItem) => {
          let sourceItems;
          switch (collectionItem.type) {
            case "highlight":
              sourceItems = highlights;
              break;
            case "note":
              sourceItems = notes;
              break;
            case "quote":
              sourceItems = quotes;
              break;
            default:
              return null;
          }

          const item = sourceItems.find(
            (source) => source.timestamp === collectionItem.id
          );
          return item ? { ...item, itemType: collectionItem.type } : null;
        })
        .filter(Boolean);
    }

    return [];
  };

  const filteredCollections = collections.filter(
    (collection) =>
      collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Smart Collections
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Collection
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCollections.map((collection) => {
          const items = getCollectionItems(collection);
          return (
            <CollectionCard
              key={collection.id}
              collection={collection}
              itemCount={items.length}
              onClick={() => setSelectedCollection(collection)}
              onEdit={() => setEditingCollection(collection)}
            />
          );
        })}
      </div>

      {/* Collection Detail Modal */}
      {selectedCollection && (
        <CollectionDetailModal
          collection={selectedCollection}
          items={getCollectionItems(selectedCollection)}
          onClose={() => setSelectedCollection(null)}
          onAddItem={addToCollection}
        />
      )}

      {/* Create Collection Modal */}
      {showCreateModal && (
        <CreateCollectionModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createCollection}
        />
      )}
    </div>
  );
};

const CollectionCard = ({ collection, itemCount, onClick, onEdit }) => {
  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-2xl">{collection.icon || "📁"}</div>
        <div className="flex gap-2">
          {collection.type === "smart" && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Smart
            </span>
          )}
          <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
            {itemCount} items
          </span>
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 mb-2">{collection.name}</h3>
      <p className="text-sm text-gray-600 mb-4">{collection.description}</p>

      {collection.createdAt && (
        <p className="text-xs text-gray-500">
          Created {format(new Date(collection.createdAt), "MMM d, yyyy")}
        </p>
      )}
    </div>
  );
};

const CollectionDetailModal = ({ collection, items, onClose, onAddItem }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">{collection.icon || "📁"}</span>
              {collection.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {collection.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {items.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No items in this collection yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium capitalize">
                          {item.itemType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(item.timestamp), "MMM d, HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {item.text || item.content}
                      </p>
                      {item.domain && (
                        <p className="text-xs text-gray-500 mt-1">
                          {item.domain}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CreateCollectionModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📁");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate({ name: name.trim(), description: description.trim(), icon });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Create New Collection
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter collection name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe this collection"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Icon
              </label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="📁"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SmartCollection;
